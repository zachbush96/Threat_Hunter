import React from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IocHistoryItem } from "@/lib/openai";

interface HistoryMenuProps {
  historyItems: IocHistoryItem[];
  isLoading: boolean;
  onSelectHistoryItem: (id: number) => void;
}

export function HistoryMenu({ historyItems, isLoading, onSelectHistoryItem }: HistoryMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="mr-2">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open history menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[350px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Search History
          </SheetTitle>
          <SheetDescription>
            View your previous URL analyses and their results.
          </SheetDescription>
        </SheetHeader>
        
        <Separator className="my-4" />
        
        <ScrollArea className="h-[calc(100vh-180px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-center">No search history found.</p>
              <p className="text-muted-foreground text-center text-sm">Search a URL to start building your history.</p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {historyItems.map((item) => (
                <SheetClose asChild key={item.id}>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto p-4 flex flex-col items-start gap-2"
                    onClick={() => onSelectHistoryItem(item.id)}
                  >
                    <div className="flex justify-between items-center w-full">
                      <h3 className="font-medium text-left truncate max-w-[80%]">
                        {truncateUrl(item.url)}
                      </h3>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground text-left">
                      Analyzed on {formatDate(item.createdAt)}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.summary.totalIndicators} indicators
                      </Badge>
                      <Badge 
                        variant={getRiskLevelVariant(item.summary.highestRiskLevel)}
                        className="text-xs"
                      >
                        {item.summary.highestRiskLevel} risk
                      </Badge>
                      {item.summary.categories.slice(0, 2).map((category) => (
                        <Badge key={category.name} variant="secondary" className="text-xs">
                          {category.count} {category.name}
                        </Badge>
                      ))}
                      {item.summary.categories.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.summary.categories.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </Button>
                </SheetClose>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Helper functions
function truncateUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.length > 30 ? hostname.substring(0, 30) + '...' : hostname;
  } catch (e) {
    return url.length > 30 ? url.substring(0, 30) + '...' : url;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
}

function getRiskLevelVariant(riskLevel: string): "default" | "destructive" | "outline" | "secondary" {
  switch (riskLevel.toLowerCase()) {
    case 'high':
      return "destructive";
    case 'medium':
      return "default";
    case 'low':
      return "secondary";
    default:
      return "outline";
  }
}