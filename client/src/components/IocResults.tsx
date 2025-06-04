import React, { useState } from "react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCode2, Link, Copy, Globe, FileText, Server, Search, Loader2, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Category, Indicator } from "@/lib/openai";

interface IocResultsProps {
  url: string;
  categories: Category[];
  isGeneratingSearches: boolean;
  onGenerateSearches: () => void;
  isFromCache?: boolean;
}

export function IocResults({ 
  url, 
  categories,
  isGeneratingSearches, 
  onGenerateSearches,
  isFromCache = false
}: IocResultsProps) {
  const { toast } = useToast();

  console.log("Categories prop:", categories);

  const copyIOCs = () => {
    const allIocs = categories.flatMap(category => 
      category.indicators.map(ioc => `${ioc.value} (${ioc.riskLevel} risk, ${ioc.category}): ${ioc.description}`)
    ).join("\n\n");

    navigator.clipboard.writeText(allIocs);
    toast({
      title: "Copied to clipboard",
      description: "All IOCs have been copied to your clipboard",
    });
  };

  // Helper to copy a single IOC
  const copyIoc = (ioc: Indicator) => {
    navigator.clipboard.writeText(ioc.value);
    toast({
      title: "Copied to clipboard",
      description: `${ioc.value} has been copied to your clipboard`,
    });
  };

  // Get icon based on category
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case "ip":
      case "ip addresses":
        return <Server className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />;
      case "domain":
      case "domains":
        return <Globe className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />;
      case "url":
      case "urls":
        return <Link className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />;
      case "hash":
      case "hashes":
      case "file hash":
      case "file hashes":
        return <FileCode2 className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />;
      default:
        return <FileText className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />;
    }
  };

  // Get badge color based on risk level
  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case "high":
        return "bg-red-500 text-white";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center">
          <CardTitle className="text-lg font-medium text-secondary-700 dark:text-secondary-200">
            Identified IOCs
          </CardTitle>
          {isFromCache && (
            <Badge variant="outline" className="ml-2 border-accent-400 text-accent-700 dark:border-accent-500 dark:text-accent-400">
              <Archive className="h-3 w-3 mr-1" />
              Cached
            </Badge>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyIOCs}
          className="h-8"
        >
          <Copy className="h-4 w-4 mr-1" />
          Copy All
        </Button>
      </CardHeader>
      <CardContent>
        {/* URL Source Card */}
        <div className="mb-4 p-4 border border-secondary-200 dark:border-secondary-600 rounded-md bg-secondary-50 dark:bg-secondary-700">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <Link className="h-5 w-5 text-secondary-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-secondary-700 dark:text-secondary-200">Analyzed URL</p>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400 break-all">{url}</p>
            </div>
          </div>
        </div>

        {/* IOC Categories Accordion */}
        <Accordion type="multiple" defaultValue={categories?.length ? categories.map(c => c.name) : []} className="space-y-4">
          {categories?.length > 0 && categories.map((category) => (
            <AccordionItem 
              key={category.name} 
              value={category.name}
              className="border border-secondary-200 dark:border-secondary-600 rounded-md overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 bg-secondary-50 dark:bg-secondary-700 hover:bg-secondary-100 dark:hover:bg-secondary-600 transition-colors">
                <div className="flex items-center">
                  {getCategoryIcon(category.name)}
                  <span className="font-medium text-secondary-700 dark:text-secondary-200">
                    {category.name}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {category.count}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 border-t border-secondary-200 dark:border-secondary-600">
                <ul className="space-y-2">
                  {category.indicators.map((ioc, index) => (
                    <li key={index} className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <span className="text-secondary-700 dark:text-secondary-200 font-mono text-sm break-all">
                            {ioc.value}
                          </span>
                          <Badge className={`ml-2 ${getRiskBadgeColor(ioc.riskLevel)}`}>
                            {ioc.riskLevel.charAt(0).toUpperCase() + ioc.riskLevel.slice(1)} Risk
                          </Badge>
                        </div>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                          {ioc.description}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-200"
                        onClick={() => copyIoc(ioc)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Generate Searches Button */}
        <div className="mt-6">
          <Button 
            className="w-full justify-center bg-accent-600 hover:bg-accent-700"
            onClick={onGenerateSearches}
            disabled={isGeneratingSearches}
          >
            {isGeneratingSearches ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Generating Searches...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Generate Search Queries
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
