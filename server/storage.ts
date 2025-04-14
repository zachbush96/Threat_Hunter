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
  
  // Search query operations
  createSearchQuery(searchQuery: InsertSearchQuery): Promise<SearchQuery>;
  getSearchQuery(id: number): Promise<SearchQuery | undefined>;
  getSearchQueryByIocId(iocId: number): Promise<SearchQuery | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private iocs: Map<number, Ioc>;
  private searchQueries: Map<number, SearchQuery>;
  private currentUserId: number;
  private currentIocId: number;
  private currentSearchQueryId: number;

  constructor() {
    this.users = new Map();
    this.iocs = new Map();
    this.searchQueries = new Map();
    this.currentUserId = 1;
    this.currentIocId = 1;
    this.currentSearchQueryId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // IOC methods
  async createIoc(insertIoc: InsertIoc): Promise<Ioc> {
    const id = this.currentIocId++;
    const ioc: Ioc = { ...insertIoc, id };
    this.iocs.set(id, ioc);
    return ioc;
  }

  async getIoc(id: number): Promise<Ioc | undefined> {
    return this.iocs.get(id);
  }

  async getIocByUrl(url: string): Promise<Ioc | undefined> {
    return Array.from(this.iocs.values()).find(
      (ioc) => ioc.url === url,
    );
  }

  // Search query methods
  async createSearchQuery(insertSearchQuery: InsertSearchQuery): Promise<SearchQuery> {
    const id = this.currentSearchQueryId++;
    const searchQuery: SearchQuery = { ...insertSearchQuery, id };
    this.searchQueries.set(id, searchQuery);
    return searchQuery;
  }

  async getSearchQuery(id: number): Promise<SearchQuery | undefined> {
    return this.searchQueries.get(id);
  }

  async getSearchQueryByIocId(iocId: number): Promise<SearchQuery | undefined> {
    return Array.from(this.searchQueries.values()).find(
      (searchQuery) => searchQuery.iocId === iocId,
    );
  }
}

export const storage = new MemStorage();
