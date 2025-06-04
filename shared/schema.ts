import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// IOC models
export const iocs = pgTable("iocs", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  rawContent: text("raw_content"),
  indicators: jsonb("indicators").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertIocSchema = createInsertSchema(iocs).pick({
  url: true,
  rawContent: true,
  indicators: true,
  createdAt: true,
});

// Search Query models
export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  iocId: integer("ioc_id").notNull(),
  qradarQueries: jsonb("qradar_queries").notNull(),
  sentinelQueries: jsonb("sentinel_queries").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertSearchQuerySchema = createInsertSchema(searchQueries).pick({
  iocId: true,
  qradarQueries: true,
  sentinelQueries: true,
  createdAt: true,
});

// Define IOC types
// export const iocCategorySchema = z.enum([
//   "ip", 
//   "domain", 
//   "url", 
//   "hash", 
//   "email", 
//   "file",
//   "CVE",
//   "registry",
//   "process",
//   "path",
//   "command",
//   "user-agent",
//   "script"
// ]);

const knownCategories = [
  "ip", "domain", "url", "hash", "email", "file", 
  "cve", "registry", "process", "path", "command", "user-agent", "script"
];

export const iocCategorySchema = z.string().transform(val => {
  if (!knownCategories.includes(val.toLowerCase())) {
    console.warn(`⚠️ Unknown IOC category received: "${val}"`);
  }
  return val;
});

export const riskLevelSchema = z.enum([
  "high",
  "medium",
  "low",
  "unknown"
]);

export const indicatorSchema = z.object({
  value: z.string(),
  category: iocCategorySchema,
  riskLevel: riskLevelSchema,
  description: z.string(),
});

export const iocResultSchema = z.object({
  indicators: z.array(indicatorSchema),
  categories: z.array(z.object({
    name: z.string(),
    count: z.number(),
    indicators: z.array(indicatorSchema)
  }))
});

export const searchQuerySchema = z.object({
  qradar: z.array(z.object({
    name: z.string(),
    query: z.string()
  })),
  sentinel: z.array(z.object({
    name: z.string(),
    query: z.string()
  }))
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertIoc = z.infer<typeof insertIocSchema>;
export type Ioc = typeof iocs.$inferSelect;
export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type IocCategory = z.infer<typeof iocCategorySchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type Indicator = z.infer<typeof indicatorSchema>;
export type IocResult = z.infer<typeof iocResultSchema>;
export type SearchQueryResult = z.infer<typeof searchQuerySchema>;
