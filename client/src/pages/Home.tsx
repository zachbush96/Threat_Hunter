import React, { useState } from "react";
import { UrlInputForm } from "@/components/UrlInputForm";
import { IocResults } from "@/components/IocResults";
import { SearchQueries } from "@/components/SearchQueries";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { FileDigit, AlertCircle } from "lucide-react";
import { 
  analyzeUrl, 
  generateSearchQueries,
  type AnalyzeUrlResponse,
  type SearchQueryResponse,
  type Indicator,
  type Category
} from "@/lib/openai";

export default function Home() {
  const [url, setUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [iocResult, setIocResult] = useState<AnalyzeUrlResponse | null>(null);
  const [isGeneratingSearches, setIsGeneratingSearches] = useState<boolean>(false);
  const [searchQueries, setSearchQueries] = useState<SearchQueryResponse | null>(null);
  
  const { toast } = useToast();
  
  const handleUrlSubmit = async (submittedUrl: string) => {
    setUrl(submittedUrl);
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeUrl(submittedUrl);
      setIocResult(result);
    } catch (error) {
      console.error("Error analyzing URL:", error);
      toast({
        title: "Error analyzing URL",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleGenerateSearches = async () => {
    if (!iocResult) return;
    
    setIsGeneratingSearches(true);
    
    try {
      // Flatten all indicators from all categories
      const allIndicators = iocResult.categories.flatMap(category => category.indicators);
      
      const result = await generateSearchQueries(allIndicators);
      setSearchQueries(result);
    } catch (error) {
      console.error("Error generating searches:", error);
      toast({
        title: "Error generating searches",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSearches(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 text-secondary-800 dark:text-secondary-100">
      <header className="bg-primary-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FileDigit className="h-8 w-8" />
            <h1 className="text-xl font-semibold">Threat Hunter</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Introduction Card */}
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2 text-primary-700 dark:text-primary-300">
            IOC Generator & Search Builder
          </h2>
          <p className="text-secondary-600 dark:text-secondary-300 mb-4">
            Extract Indicators of Compromise (IOCs) from suspicious URLs and generate QRadar and Microsoft Sentinel search queries.
          </p>
          <div className="bg-secondary-50 dark:bg-secondary-700 rounded p-4 text-sm border-l-4 border-accent-500">
            <p className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
              <span className="dark:text-secondary-200">
                This tool uses Firecrawl API to scrape URLs and OpenAI to analyze the content for IOCs and generate search queries for QRadar and Microsoft Sentinel.
              </span>
            </p>
          </div>
        </div>

        {/* URL Input Form */}
        <UrlInputForm onSubmit={handleUrlSubmit} isLoading={isAnalyzing} />

        {/* IOC Results */}
        {iocResult && (
          <IocResults 
            url={url}
            categories={iocResult.indicators?.categories || []}
            isGeneratingSearches={isGeneratingSearches}
            onGenerateSearches={handleGenerateSearches}
          />
        )}

        {/* Search Queries */}
        {searchQueries && (
          <SearchQueries 
            qradarQueries={searchQueries.qradar}
            sentinelQueries={searchQueries.sentinel}
          />
        )}
      </main>

      <footer className="bg-secondary-100 dark:bg-secondary-800 py-4">
        <div className="container mx-auto px-4 text-center text-secondary-500 dark:text-secondary-400 text-sm">
          <p>Threat Hunter &copy; {new Date().getFullYear()} - IOC Generator & Search Builder</p>
        </div>
      </footer>
    </div>
  );
}
