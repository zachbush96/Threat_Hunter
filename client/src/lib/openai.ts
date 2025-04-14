import { apiRequest } from "./queryClient";

export interface AnalyzeUrlResponse {
  indicators: {
    categories: Category[];
    indicators: Indicator[];
  };
  message?: string;
}

export interface Indicator {
  value: string;
  category: "ip" | "domain" | "url" | "hash" | "email" | "file";
  riskLevel: "high" | "medium" | "low" | "unknown";
  description: string;
}

export interface Category {
  name: string;
  count: number;
  indicators: Indicator[];
}

export interface SearchQuery {
  name: string;
  query: string;
}

export interface SearchQueryResponse {
  qradar: SearchQuery[];
  sentinel: SearchQuery[];
}

// Function to analyze a URL
export async function analyzeUrl(url: string): Promise<AnalyzeUrlResponse> {
  const response = await apiRequest('POST', '/api/analyze-url', { url });
  return await response.json();
}

// Function to generate search queries
export async function generateSearchQueries(indicators: Indicator[], iocId?: number): Promise<SearchQueryResponse> {
  const response = await apiRequest('POST', '/api/generate-searches', { 
    indicators,
    iocId
  });
  return await response.json();
}
