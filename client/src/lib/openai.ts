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

// New interfaces for history features
export interface IocHistoryItem {
  id: number;
  url: string;
  createdAt: string;
  summary: {
    totalIndicators: number;
    categories: {
      name: string;
      count: number;
    }[];
    highestRiskLevel: string;
  };
}

export interface IocDetailResponse {
  ioc: {
    id: number;
    url: string;
    indicators: {
      categories: Category[];
      indicators: Indicator[];
    };
    createdAt: string;
  };
  searchQueries: {
    qradarQueries: SearchQuery[];
    sentinelQueries: SearchQuery[];
  } | null;
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

// Function to get history of all IOCs
export async function getIocHistory(): Promise<IocHistoryItem[]> {
  const response = await apiRequest('GET', '/api/history');
  return await response.json();
}

// Function to get a specific IOC by ID
export async function getIocById(id: number): Promise<IocDetailResponse> {
  const response = await apiRequest('GET', `/api/history/${id}`);
  return await response.json();
}
