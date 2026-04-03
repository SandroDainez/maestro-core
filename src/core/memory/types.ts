export const GLOBAL_TENANT_ID = "__global__";

export type MemoryScope = "project" | "tenant" | "global";

export type MemoryCategory =
  | "decision"
  | "plan"
  | "execution"
  | "preference"
  | "evaluation"
  | "performance";

export type MemoryMetadataValue = string | number | boolean | null;

export type MemoryMetadata = Record<string, MemoryMetadataValue>;

export type MemoryRecord = {
  id: string;
  tenantId: string;
  projectId: string | null;
  scope: MemoryScope;
  category: MemoryCategory;
  content: string;
  embedding: number[];
  metadata: MemoryMetadata;
  createdAt: string;
  updatedAt: string;
};

export type MemorySearchResult = MemoryRecord & {
  score: number;
  similarityScore: number;
  evaluationScore: number;
  recencyScore: number;
};

export type StoreMemoryInput = {
  id?: string;
  projectId?: string | null;
  scope: MemoryScope;
  category: MemoryCategory;
  content: string;
  metadata?: MemoryMetadata;
};

export type StoreMemoryContext = {
  tenantId: string;
  projectId?: string | null;
};

export type RetrieveRelevantMemoryInput = {
  query: string;
  tenantId: string;
  projectId?: string | null;
  categories?: MemoryCategory[];
  scopes?: MemoryScope[];
  minScore?: number;
  maxScore?: number;
  metadataMatches?: Record<string, MemoryMetadataValue>;
  topK?: number;
};

export interface EmbeddingModel {
  embed(input: string): Promise<number[]>;
}

export interface MemoryStore {
  upsert(record: MemoryRecord): Promise<MemoryRecord>;
  search(input: {
    tenantId: string;
    projectId?: string | null;
    embedding: number[];
    categories?: MemoryCategory[];
    scopes?: MemoryScope[];
    minScore?: number;
    maxScore?: number;
    metadataMatches?: Record<string, MemoryMetadataValue>;
    topK?: number;
  }): Promise<MemorySearchResult[]>;
}

export interface MemoryIndexer {
  storeMemory(
    input: StoreMemoryInput,
    context: StoreMemoryContext
  ): Promise<MemoryRecord>;
}

export interface MemoryRetriever {
  retrieveRelevantMemory(
    input: RetrieveRelevantMemoryInput
  ): Promise<MemorySearchResult[]>;
}
