import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { iocResultSchema, insertIocSchema, insertSearchQuerySchema, searchQuerySchema } from "@shared/schema";
import fetch from "node-fetch";
import OpenAI from "openai";
import { z } from "zod";
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
  app.post("/api/analyze-url", async (req, res) => {
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
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a cybersecurity expert specializing in extracting Indicators of Compromise (IOCs) from web content. 
            Analyze the provided content and identify any potential IOCs such as:
            - IP addresses
            - Domain names
            - URLs
            - File hashes (MD5, SHA1, SHA256)
            - Email addresses
            - Filenames and paths
            
            For each IOC, determine its risk level (high, medium, low, or unknown) and provide a brief description of where it was found and what makes it suspicious.
            
            Organize the IOCs by category, and provide a count for each category.
            
            Return the results as a JSON object with this structure:
            {
              "indicators": [
                {
                  "value": "actual indicator value",
                  "category": "ip|domain|url|hash|email|file",
                  "riskLevel": "high|medium|low|unknown",
                  "description": "brief description of where found and why suspicious"
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
  app.post("/api/generate-searches", async (req, res) => {
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
            content: `You are a SIEM expert specializing in QRadar and Microsoft Sentinel. Generate search queries for the provided IOCs.
            
            For QRadar, create AQL queries that search for the provided IOCs in appropriate log sources.
            For Microsoft Sentinel, create KQL queries that search for the provided IOCs.
            
            Group queries by IOC type (IP, domain, hash, etc.). Each query should include:
            1. A descriptive name
            2. The actual query formatted properly for the respective system
            
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

  const httpServer = createServer(app);

  return httpServer;
}
