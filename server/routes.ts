import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { iocResultSchema, insertIocSchema, insertSearchQuerySchema, searchQuerySchema, type IocResult } from "@shared/schema";
import fetch from "node-fetch";
import OpenAI from "openai";
import { z } from "zod";
import { ensureAuthenticated } from "./auth";
import { parse } from 'node-html-parser';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Create a FireCrawl client
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY || "";
const firecrawlBaseUrl = "https://api.firecrawl.dev/v1";

export async function registerRoutes(app: Express): Promise<Server> {
  // Route to scrape URL with Firecrawl and extract IOCs with OpenAI
  app.post("/api/analyze-url", ensureAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Check if we already have this URL analyzed
      const existingIoc = await storage.getIocByUrl(url);
      if (existingIoc) {
        return res.json({ 
          indicators: existingIoc.indicators,
          message: "Retrieved from cache"
        });
      }

      let scrapedContent = "";

      // Try to use Firecrawl API first
      try {
        console.log(`Scraping URL with Firecrawl: ${url}`);
        const firecrawlResponse = await fetch(`${firecrawlBaseUrl}/scrape`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${firecrawlApiKey}`
          },
          body: JSON.stringify({ 
            url,
            formats: ["markdown"] 
          })
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json() as { 
            success: boolean; 
            data?: { 
              markdown?: string;
              metadata?: {
                title?: string;
                description?: string;
                language?: string | null;
                sourceURL?: string;
              }
            } 
          };

          if (firecrawlData.success && firecrawlData.data?.markdown) {
            scrapedContent = firecrawlData.data.markdown;
            console.log("Successfully scraped URL with Firecrawl");
          } else {
            throw new Error("Invalid response from Firecrawl");
          }
        } else {
          throw new Error(`Firecrawl API error: ${firecrawlResponse.status}`);
        }
      } catch (fireError) {
        console.warn("Error using Firecrawl API, falling back to direct fetch:", fireError);

        // Fallback to direct fetch
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          return res.status(response.status).json({ 
            message: `Error fetching URL: ${response.statusText}` 
          });
        }

        const htmlContent = await response.text();

        // Parse HTML to extract text content
        const root = parse(htmlContent);
        // Remove script and style elements
        root.querySelectorAll('script, style').forEach(el => el.remove());

        // Get text content and clean it up
        scrapedContent = root.textContent;
        // Basic cleaning - remove extra whitespace
        scrapedContent = scrapedContent.replace(/\s+/g, ' ').trim();
      }

      // Use OpenAI to extract IOCs from the scraped content
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a cybersecurity expert specializing in threat hunting and extracting Indicators of Compromise (IOCs) from vulnerability reports and exploit descriptions.

            Your primary focus is on uncovering technical IOCs that are directly related to the exploit/vulnerability being discussed, not just references or links to learn more.

            Analyze the provided content and extract the following types of IOCs:
            - IP addresses used in attacks or mentioned as malicious/suspicious
            - Domain names used by attackers or involved in the exploit
            - URLs specifically tied to the exploit (attack paths, malicious endpoints, etc.)
            - File hashes (MD5, SHA1, SHA256) for any malicious files, payloads, or artifacts
            - Email addresses used by attackers or involved in phishing/social engineering
            - Filenames and paths of vulnerable files, payloads, or attack tools
            - CVE IDs and vulnerability identifiers
            - Command lines, curl commands, or exploit code snippets
            - Registry keys, process names, or services affected

            Only include IOCs that are actually related to the exploit or attack itself - DO NOT include general references, documentation links, or URLs to security blog posts unless they are part of the attack infrastructure.

            do NOT include links to security blogs or documentation. All URLs should be directly related to the exploit or attack itself, not a reference to a blog post or documentation about the exploit.

            For each IOC, determine its risk level (high, medium, low, or unknown) based on:
            - High: Directly tied to active attacks or exploitation
            - Medium: Potentially malicious or part of the vulnerability but not confirmed as actively used
            - Low: Related but not inherently malicious
            - Unknown: Unable to determine risk level

            Provide a detailed technical description for each IOC explaining:
            1. Where in the content it was found
            2. How it relates to the exploit/vulnerability
            3. Why it's significant for security monitoring

            Organize the IOCs by category, and provide a count for each category.

            Return the results as a JSON object with this structure:
            {
              "indicators": [
                {
                  "value": "actual indicator value",
                  "category": "ip|domain|url|hash|email|file|command|registry|process|cve|service|filename|path|script"
                  "riskLevel": "high|medium|low|unknown",
                  "description": "technical description of why this is significant"
                }
              ],
              "categories": [
                {
                  "name": "category name",
                  "count": 0,
                  "indicators": [array of indicator objects for this category]
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Analyze this web content for IOCs:\n\n${scrapedContent}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = openaiResponse.choices[0].message.content || "{}";
      const iocResults = JSON.parse(content);

      // Validate the IOC results
      const validatedResults = iocResultSchema.parse(iocResults);

      // Store the IOC results
      const ioc = await storage.createIoc({
        url,
        rawContent: scrapedContent,
        indicators: validatedResults,
        userId: (req.user as any).id,
        createdAt: new Date().toISOString()
      });

      return res.json(validatedResults);

    } catch (error) {
      console.error("Error analyzing URL:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      });
    }
  });

  // Route to generate search queries for IOCs
  app.post("/api/generate-searches", ensureAuthenticated, async (req, res) => {
    try {
      const { indicators } = req.body;

      if (!indicators || !Array.isArray(indicators)) {
        return res.status(400).json({ message: "Valid indicators are required" });
      }

      // Use OpenAI to generate search queries based on IOCs
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a SIEM expert specializing in QRadar and Microsoft Sentinel. Generate high-quality, production-ready search queries for the provided IOCs.

            For QRadar:
            - Create detailed AQL queries that search for the provided IOCs across appropriate log sources
            - Include event correlation, time filtering (last 30 days), and properly formatted field selections
            - For IP addresses, include checks in both source and destination IP fields
            - For domains/URLs, check in DNS queries, HTTP requests, proxy logs
            - For file hashes, check against file hash fields in EDR/antivirus logs
            - For registry keys or filenames, check against Windows event logs

            For Microsoft Sentinel:
            - Create comprehensive KQL queries using proper Sentinel tables and joins when needed
            - Include timeframe filters (last 30 days), project statements, and where clauses
            - For IP addresses, check NetworkSession, SecurityEvent, etc.
            - For domains/URLs, check DNS, web proxy logs, and Office 365 logs
            - For file hashes, check SecurityEvent and DeviceFileEvents
            - Include proper syntax for sorting, limiting, and displaying results

            Group queries logically by IOC type (IP, domain, hash, etc.) and threat context. Each query should include:
            1. A specific and descriptive name that indicates the purpose and target
            2. The complete, properly-formatted query with comments where helpful

            Return the results as a JSON object with this structure:
            {
              "qradar": [
                {
                  "name": "descriptive name",
                  "query": "AQL query"
                }
              ],
              "sentinel": [
                {
                  "name": "descriptive name",
                  "query": "KQL query"
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Generate search queries for these IOCs:\n\n${JSON.stringify(indicators)}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const searchContent = openaiResponse.choices[0].message.content || "{}";
      const searchQueries = JSON.parse(searchContent);

      // Validate the search queries
      const validatedQueries = searchQuerySchema.parse(searchQueries);

      // Store the search queries (if we had a specific IOC id)
      if (req.body.iocId) {
        await storage.createSearchQuery({
          iocId: req.body.iocId,
          qradarQueries: validatedQueries.qradar,
          sentinelQueries: validatedQueries.sentinel,
          createdAt: new Date().toISOString()
        });
      }

      return res.json(validatedQueries);

    } catch (error) {
      console.error("Error generating searches:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      });
    }
  });

  // Route to retrieve IOC history
  app.get("/api/history", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as number;
      const iocHistory = await storage.getIocsByUser(userId);

      // Map the results to include only necessary data for the listing
      const history = iocHistory.map(ioc => {
        const indicatorsData = ioc.indicators as IocResult;
        return {
          id: ioc.id,
          url: ioc.url,
          createdAt: ioc.createdAt,
          summary: {
            totalIndicators: indicatorsData.indicators?.length || 0,
            categories: indicatorsData.categories?.map((cat: any) => ({
              name: cat.name,
              count: cat.count
            })) || [],
            highestRiskLevel: getHighestRiskLevel(indicatorsData.indicators || [])
          }
        };
      });

      return res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      });
    }
  });

  // Route to retrieve a specific IOC by ID
  app.get("/api/history/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const ioc = await storage.getIoc(id);
      if (!ioc) {
        return res.status(404).json({ message: "IOC not found" });
      }

      if (ioc.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get associated search queries if they exist
      const searchQuery = await storage.getSearchQueryByIocId(id);

      return res.json({ 
        ioc,
        searchQueries: searchQuery || null
      });

    } catch (error) {
      console.error("Error fetching IOC details:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      });
    }
  });

  // Helper function to determine highest risk level
  function getHighestRiskLevel(indicators: any[]): string {
    const riskPriority = {
      high: 3,
      medium: 2, 
      low: 1,
      unknown: 0
    };

    let highestRisk = "unknown";

    for (const indicator of indicators) {
      if (riskPriority[indicator.riskLevel as keyof typeof riskPriority] > 
          riskPriority[highestRisk as keyof typeof riskPriority]) {
        highestRisk = indicator.riskLevel;
      }

      if (highestRisk === "high") break; // Can't get higher than high
    }

    return highestRisk;
  }

  const httpServer = createServer(app);

  return httpServer;
}
