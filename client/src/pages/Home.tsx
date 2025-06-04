import React, { useState, useEffect } from "react";
import { UrlInputForm } from "@/components/UrlInputForm";
import { IocResults } from "@/components/IocResults";
import { SearchQueries } from "@/components/SearchQueries";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HistoryMenu } from "@/components/HistoryMenu";
import { useToast } from "@/hooks/use-toast";
import { FileDigit, AlertCircle, Archive } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  analyzeUrl, 
  generateSearchQueries,
  getIocHistory,
  getIocById,
  type AnalyzeUrlResponse,
  type SearchQueryResponse,
  type Indicator,
  type Category,
  type IocHistoryItem,
  type IocDetailResponse
} from "@/lib/openai";

export default function Home() {
  const [url, setUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [iocResult, setIocResult] = useState<AnalyzeUrlResponse | null>(null);
  const [isGeneratingSearches, setIsGeneratingSearches] = useState<boolean>(false);
  const [searchQueries, setSearchQueries] = useState<SearchQueryResponse | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<IocHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const { toast } = useToast();

  // Fetch search history when component mounts
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getIocHistory();
      setHistoryItems(history);
    } catch (error) {
      console.error("Error loading search history:", error);
      toast({
        title: "Error loading history",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectHistoryItem = async (id: number) => {
    setIsAnalyzing(true);
    try {
      const result = await getIocById(id);

      // Update the UI with the loaded history item
      setUrl(result.ioc.url);
      setIocResult({
        indicators: result.ioc.indicators,
        message: "Retrieved from history"
      });

      // If search queries exist, load them too
      if (result.searchQueries) {
        setSearchQueries({
          qradar: result.searchQueries.qradarQueries,
          sentinel: result.searchQueries.sentinelQueries
        });
      } else {
        setSearchQueries(null);
      }

      setIsFromCache(true);

      toast({
        title: "History item loaded",
        description: `Successfully loaded previous analysis for ${truncateUrl(result.ioc.url)}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error loading history item:", error);
      toast({
        title: "Error loading history item",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUrlSubmit = async (submittedUrl: string) => {
    setUrl(submittedUrl);
    setIsAnalyzing(true);
    setIsFromCache(false);
    setSearchQueries(null);

    try {
      const result = await analyzeUrl(submittedUrl);
      setIocResult(result);

      // Check if result is from cache
      if (result.message === "Retrieved from cache") {
        setIsFromCache(true);
        toast({
          title: "Using cached results",
          description: "This URL has been analyzed before. Showing previous results.",
          variant: "default"
        });
      }

      // Refresh the history list after a new search
      loadSearchHistory();
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
      // Access indicators array from the nested structure
      const allIndicators = iocResult.indicators.indicators || [];

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

  useEffect(() => {
    if (iocResult) {
      console.log("IOC Result:", iocResult);
    }
  }, [iocResult]);

  // Helper function to truncate URLs for display
  const truncateUrl = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.length > 30 ? hostname.substring(0, 30) + '...' : hostname;
    } catch (e) {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 text-secondary-800 dark:text-secondary-100">
      <header className="bg-primary-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <HistoryMenu 
              historyItems={historyItems} 
              isLoading={isLoadingHistory} 
              onSelectHistoryItem={handleSelectHistoryItem}
            />
            <div className="flex items-center space-x-2">
              <FileDigit className="h-8 w-8" />
              <h1 className="text-xl font-semibold">Threat Hunter</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Introduction Card */}
        <div className="bg-white text-black dark:bg-secondary-800 dark:text-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2 text-black dark:text-primary-300">
            IOC Generator & Search Builder
          </h2>
          <p className="text-black dark:text-secondary-300 mb-4">
            Extract Indicators of Compromise (IOCs) from suspicious URLs and generate QRadar and Microsoft Sentinel search queries.
          </p>
          <div className="bg-secondary-50 dark:bg-secondary-700 rounded p-4 text-black dark:text-secondary-200 text-sm border-l-4 border-accent-500">
            <p className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
              <span>
                This tool uses Firecrawl API to scrape URLs and OpenAI to analyze the content for IOCs and generate search queries for QRadar and Microsoft Sentinel.
              </span>
            </p>
          </div>
        </div>


        {/* URL Input Form */}
        <UrlInputForm onSubmit={handleUrlSubmit} isLoading={isAnalyzing} />

        {/* Cached Results Alert */}
        {isFromCache && iocResult && (
          <Alert className="mb-6 border-accent-400 bg-accent-50 dark:bg-secondary-800 dark:border-accent-700">
            <Archive className="h-4 w-4 text-accent-600 dark:text-accent-500" />
            <AlertDescription className="text-accent-800 dark:text-accent-400">
              Showing cached results for this URL. Previously analyzed on {new Date().toLocaleDateString()}.
            </AlertDescription>
          </Alert>
        )}

        {/* IOC Results */}
        {iocResult && (
          <IocResults 
            url={url}
            categories={iocResult.indicators.categories}
            isGeneratingSearches={isGeneratingSearches}
            onGenerateSearches={handleGenerateSearches}
            isFromCache={isFromCache}
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
          <p>Threat Hunter &copy; {new Date().toLocaleDateString()} - IOC Generator & Search Builder</p>
        </div>
      </footer>
    </div>
  );
}
