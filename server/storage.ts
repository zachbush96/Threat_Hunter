import { 
  users, type User, type InsertUser,
  iocs, type Ioc, type InsertIoc,
  searchQueries, type SearchQuery, type InsertSearchQuery,
  type IocResult, type SearchQueryResult
} from "@shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // IOC operations
  createIoc(ioc: InsertIoc): Promise<Ioc>;
  getIoc(id: number): Promise<Ioc | undefined>;
  getIocByUrl(url: string): Promise<Ioc | undefined>;
  getAllIocs(): Promise<Ioc[]>; // New method for history

  // Search query operations
  createSearchQuery(searchQuery: InsertSearchQuery): Promise<SearchQuery>;
  getSearchQuery(id: number): Promise<SearchQuery | undefined>;
  getSearchQueryByIocId(iocId: number): Promise<SearchQuery | undefined>;
}

import { db } from "./db";
import { eq } from "drizzle-orm";

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // IOC methods
  async createIoc(insertIoc: InsertIoc): Promise<Ioc> {
    const [ioc] = await db
      .insert(iocs)
      .values(insertIoc)
      .returning();
    return ioc;
  }

  async getIoc(id: number): Promise<Ioc | undefined> {
    const [ioc] = await db.select().from(iocs).where(eq(iocs.id, id));
    return ioc || undefined;
  }

  async getIocByUrl(url: string): Promise<Ioc | undefined> {
    const [ioc] = await db.select().from(iocs).where(eq(iocs.url, url));
    return ioc || undefined;
  }

  async getAllIocs(): Promise<Ioc[]> {
    const iocsList = await db.select().from(iocs);
    return iocsList;
  }

  // Search query methods
  async createSearchQuery(insertSearchQuery: InsertSearchQuery): Promise<SearchQuery> {
    const [searchQuery] = await db
      .insert(searchQueries)
      .values(insertSearchQuery)
      .returning();
    return searchQuery;
  }

  async getSearchQuery(id: number): Promise<SearchQuery | undefined> {
    const [searchQuery] = await db.select().from(searchQueries).where(eq(searchQueries.id, id));
    return searchQuery || undefined;
  }

  async getSearchQueryByIocId(iocId: number): Promise<SearchQuery | undefined> {
    const [searchQuery] = await db.select().from(searchQueries).where(eq(searchQueries.iocId, iocId));
    return searchQuery || undefined;
  }
}

export const storage = new DatabaseStorage();
