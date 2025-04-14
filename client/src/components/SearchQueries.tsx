import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchQuery } from "@/lib/openai";

interface SearchQueriesProps {
  qradarQueries: SearchQuery[];
  sentinelQueries: SearchQuery[];
}

export function SearchQueries({ qradarQueries, sentinelQueries }: SearchQueriesProps) {
  const [activeTab, setActiveTab] = useState<string>("qradar");
  const { toast } = useToast();
  
  const copyQRadarQueries = () => {
    const allQueries = qradarQueries
      .map(q => `-- ${q.name}\n${q.query}`)
      .join("\n\n");
    
    navigator.clipboard.writeText(allQueries);
    toast({
      title: "Copied to clipboard",
      description: "All QRadar queries have been copied to your clipboard",
    });
  };
  
  const copySentinelQueries = () => {
    const allQueries = sentinelQueries
      .map(q => `// ${q.name}\n${q.query}`)
      .join("\n\n");
    
    navigator.clipboard.writeText(allQueries);
    toast({
      title: "Copied to clipboard",
      description: "All Microsoft Sentinel queries have been copied to your clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-secondary-700 dark:text-secondary-200">
          Search Queries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="qradar" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="qradar">QRadar</TabsTrigger>
            <TabsTrigger value="sentinel">Microsoft Sentinel</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qradar" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-200">
                QRadar AQL Queries
              </h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyQRadarQueries}
                className="h-8"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy All
              </Button>
            </div>
            
            {qradarQueries.map((query, index) => (
              <div key={index} className="border border-secondary-200 dark:border-secondary-600 rounded-md">
                <CodeBlock 
                  name={query.name}
                  content={query.query}
                  language="sql"
                />
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="sentinel" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-200">
                Microsoft Sentinel KQL Queries
              </h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copySentinelQueries}
                className="h-8"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy All
              </Button>
            </div>
            
            {sentinelQueries.map((query, index) => (
              <div key={index} className="border border-secondary-200 dark:border-secondary-600 rounded-md">
                <CodeBlock 
                  name={query.name}
                  content={query.query}
                  language="kql"
                />
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
