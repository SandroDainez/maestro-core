import { randomUUID } from "crypto";

import type {
  EmbeddingModel,
  MemoryIndexer,
  MemoryRecord,
  MemoryRetriever,
  MemorySearchResult,
  MemoryStore,
  RetrieveRelevantMemoryInput,
  StoreMemoryContext,
  StoreMemoryInput,
} from "./types";
import { GLOBAL_TENANT_ID } from "./types";

export class SemanticMemoryService implements MemoryIndexer, MemoryRetriever {
  constructor(
    private readonly store: MemoryStore,
    private readonly embeddings: EmbeddingModel
  ) {}

  async storeMemory(
    input: StoreMemoryInput,
    context: StoreMemoryContext
  ): Promise<MemoryRecord> {
    const timestamp = new Date().toISOString();
    const tenantId =
      input.scope === "global" ? GLOBAL_TENANT_ID : context.tenantId;
    const projectId =
      input.scope === "project"
        ? (input.projectId ?? context.projectId ?? null)
        : null;

    const record: MemoryRecord = {
      id: input.id ?? randomUUID(),
      tenantId,
      projectId,
      scope: input.scope,
      category: input.category,
      content: input.content,
      embedding: await this.embeddings.embed(input.content),
      metadata: input.metadata ?? {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return this.store.upsert(record);
  }

  async retrieveRelevantMemory(
    input: RetrieveRelevantMemoryInput
  ): Promise<MemorySearchResult[]> {
    return this.store.search({
      tenantId: input.tenantId,
      projectId: input.projectId ?? null,
      embedding: await this.embeddings.embed(input.query),
      categories: input.categories,
      scopes: input.scopes,
      minScore: input.minScore,
      maxScore: input.maxScore,
      metadataMatches: input.metadataMatches,
      topK: input.topK,
    });
  }
}
