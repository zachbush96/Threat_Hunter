import React from "react";
import { Copy } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CodeBlockProps {
  content: string;
  language?: string;
  name?: string;
  className?: string;
}

export function CodeBlock({ content, language = "sql", name, className }: CodeBlockProps) {
  const { toast } = useToast();
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "The code has been copied to your clipboard",
    });
  };
  
  // Function to add syntax highlighting
  const formatCode = (code: string) => {
    const commentRegex = language === "sql" 
      ? /(--.+)(?:\r\n|\n|$)/g 
      : /(\/\/.+)(?:\r\n|\n|$)/g;
    
    const operatorRegex = /(AND|OR|IN|NOT|LIKE|ILIKE|=|!=|>|<|>=|<=)/g;
    const queryRegex = /(SELECT|FROM|WHERE|ORDER BY|GROUP BY|HAVING|UNION|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|WITH|let|where|project|sort|extend|join|union|\||limit)/g;
    const valueRegex = /('[^']*'|\d+\.\d+|\d+)/g;
    
    return code
      .replace(commentRegex, '<span class="text-secondary-500">$1</span>')
      .replace(operatorRegex, '<span class="text-pink-400">$1</span>')
      .replace(queryRegex, '<span class="text-blue-400">$1</span>')
      .replace(valueRegex, '<span class="text-green-400">$1</span>');
  };
  
  return (
    <div className={cn("relative", className)}>
      {name && (
        <div className="flex justify-between items-center px-4 py-2 bg-secondary-50 dark:bg-secondary-700 border-b border-secondary-200 dark:border-secondary-600">
          <h5 className="text-xs font-medium text-secondary-700 dark:text-secondary-200">{name}</h5>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 w-6 p-0 rounded-sm"
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copy</span>
          </Button>
        </div>
      )}
      <div className="bg-[#1a202c] rounded-b-md p-4 overflow-x-auto">
        <pre className="font-mono text-sm text-secondary-200" 
          dangerouslySetInnerHTML={{ __html: formatCode(content) }} 
        />
      </div>
    </div>
  );
}
