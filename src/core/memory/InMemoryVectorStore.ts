import type {
  MemoryMetadataValue,
  MemoryRecord,
  MemoryScope,
  MemorySearchResult,
  MemoryStore,
} from "./types";
import { GLOBAL_TENANT_ID } from "./types";

function cosineSimilarity(left: number[], right: number[]) {
  const size = Math.min(left.length, right.length);
  if (size === 0) return 0;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < size; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function readNumericMetadata(record: MemoryRecord, key: string) {
  const value = record.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function computeRecencyScore(record: MemoryRecord) {
  const timestamp = Date.parse(record.updatedAt ?? record.createdAt);
  if (Number.isNaN(timestamp)) {
    return 0;
  }

  const ageMs = Math.max(0, Date.now() - timestamp);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Number((1 / (1 + ageDays)).toFixed(6));
}

function metadataMatches(
  record: MemoryRecord,
  filters?: Record<string, MemoryMetadataValue>
) {
  if (!filters) return true;

  return Object.entries(filters).every(
    ([key, value]) => record.metadata[key] === value
  );
}

export class InMemoryVectorStore implements MemoryStore {
  private readonly records = new Map<string, MemoryRecord>();

  async upsert(record: MemoryRecord): Promise<MemoryRecord> {
    this.records.set(record.id, record);
    return record;
  }

  async search(input: {
    tenantId: string;
    projectId?: string | null;
    embedding: number[];
    categories?: MemoryRecord["category"][];
    scopes?: MemoryScope[];
    minScore?: number;
    maxScore?: number;
    metadataMatches?: Record<string, MemoryMetadataValue>;
    topK?: number;
  }): Promise<MemorySearchResult[]> {
    const matches = Array.from(this.records.values())
      .filter((record) => this.matchesScope(record, input.tenantId, input.projectId))
      .filter((record) =>
        input.categories?.length
          ? input.categories.includes(record.category)
          : true
      )
      .filter((record) =>
        input.scopes?.length ? input.scopes.includes(record.scope) : true
      )
      .filter((record) => metadataMatches(record, input.metadataMatches))
      .map((record) => ({
        ...record,
        similarityScore: cosineSimilarity(input.embedding, record.embedding),
        evaluationScore: Math.max(
          0,
          Math.min(
            1,
            readNumericMetadata(record, "score") ??
              readNumericMetadata(record, "successRate") ??
              0
          )
        ),
        recencyScore: computeRecencyScore(record),
      }))
      .map((record) => ({
        ...record,
        score: Number(
          (
            record.similarityScore * 0.55 +
            record.evaluationScore * 0.35 +
            record.recencyScore * 0.1
          ).toFixed(6)
        ),
      }))
      .filter((record) =>
        typeof input.minScore === "number" ? record.evaluationScore >= input.minScore : true
      )
      .filter((record) =>
        typeof input.maxScore === "number" ? record.evaluationScore <= input.maxScore : true
      )
      .sort((left, right) => right.score - left.score);

    return matches.slice(0, input.topK ?? matches.length);
  }

  private matchesScope(
    record: MemoryRecord,
    tenantId: string,
    projectId?: string | null
  ) {
    if (record.scope === "global") {
      return record.tenantId === GLOBAL_TENANT_ID;
    }

    if (record.scope === "tenant") {
      return record.tenantId === tenantId;
    }

    return record.tenantId === tenantId && record.projectId === (projectId ?? null);
  }
}
