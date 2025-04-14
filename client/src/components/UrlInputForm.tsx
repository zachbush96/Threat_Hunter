import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Link } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const urlSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL (e.g., https://example.com)" })
});

type UrlFormValues = z.infer<typeof urlSchema>;

interface UrlInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function UrlInputForm({ onSubmit, isLoading }: UrlInputFormProps) {
  const form = useForm<UrlFormValues>({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      url: "",
    },
  });

  const handleSubmit = (values: UrlFormValues) => {
    onSubmit(values.url);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-secondary-700 dark:text-secondary-200">
          Enter Suspicious URL
        </CardTitle>
        <CardDescription>
          Enter a URL to analyze for indicators of compromise
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-secondary-600 dark:text-secondary-300">
                    URL to Analyze
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Link className="h-5 w-5 text-secondary-400" />
                      </div>
                      <Input
                        placeholder="https://example.com/suspicious-page"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-end">
              <Button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 font-medium rounded-md shadow-sm text-white bg-primary-700 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze URL"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
