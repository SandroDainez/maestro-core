import { MemoryManager } from "../../memory/MemoryManager";
import { DeterministicEmbeddingModel } from "../../memory/DeterministicEmbeddingModel";
import { InMemoryVectorStore } from "../../memory/InMemoryVectorStore";
import { SemanticMemoryService } from "../../memory/SemanticMemoryService";
import type {
  MemoryIndexer,
  MemorySearchResult,
  StoreMemoryContext,
  StoreMemoryInput,
} from "../../memory/types";
import type {
  MemoryRetrievalPort,
  MemoryRetrievalQuery,
} from "../ports/MemoryRetrievalPort";
import type {
  MemoryRecord,
  PlanningFeedbackContext,
  PlanningFeedbackPattern,
  PlanningMemoryContext,
  PlanningPerformanceSignal,
} from "../types";

export class LocalMemoryRetrieval implements MemoryRetrievalPort, MemoryIndexer {
  private readonly semanticMemory = new SemanticMemoryService(
    new InMemoryVectorStore(),
    new DeterministicEmbeddingModel()
  );
  private seededProjects = new Set<string>();

  constructor(private readonly memory: MemoryManager = new MemoryManager()) {}

  async retrieve(query: MemoryRetrievalQuery): Promise<PlanningMemoryContext> {
    await this.seedMemory(query);

    const preferences = this.memory.getAllPreferences();
    const recentProjects = this.memory.getRecentProjects();
    const recentDecisions = this.memory.getDecisions().slice(-10);
    const memoryQuery = [
      query.objective.raw,
      query.objective.normalized,
      query.projectPath,
      recentDecisions.join("\n"),
    ]
      .filter(Boolean)
      .join("\n");
    const semanticResults = await this.semanticMemory.retrieveRelevantMemory({
      query: memoryQuery,
      tenantId: query.tenantId,
      projectId: query.projectId,
      categories: query.categories,
      scopes: query.scopes,
      topK: query.limit ?? 8,
    });
    const successfulRecords = await this.semanticMemory.retrieveRelevantMemory({
      query: memoryQuery,
      tenantId: query.tenantId,
      projectId: query.projectId,
      categories: ["plan", "execution", "evaluation"],
      minScore: query.successScoreThreshold ?? 0.75,
      topK: 8,
    });
    const failedRecords = await this.semanticMemory.retrieveRelevantMemory({
      query: memoryQuery,
      tenantId: query.tenantId,
      projectId: query.projectId,
      categories: ["plan", "execution", "evaluation"],
      maxScore: query.failureScoreThreshold ?? 0.45,
      topK: 8,
    });
    const agentPerformanceRecords = await this.semanticMemory.retrieveRelevantMemory({
      query: memoryQuery,
      tenantId: query.tenantId,
      projectId: query.projectId,
      categories: ["performance"],
      metadataMatches: {
        entityType: "agent",
      },
      topK: 6,
    });
    const toolPerformanceRecords = await this.semanticMemory.retrieveRelevantMemory({
      query: memoryQuery,
      tenantId: query.tenantId,
      projectId: query.projectId,
      categories: ["performance"],
      metadataMatches: {
        entityType: "tool",
      },
      topK: 6,
    });
    const projectRecords: MemoryRecord[] = recentProjects.map((projectPath, index) => ({
      id: `project-${index + 1}`,
      tenantId: query.tenantId,
      projectId: projectPath === query.projectPath ? query.projectId : null,
      scope: projectPath === query.projectPath ? "project" : "global",
      category: "plan",
      content: projectPath,
      metadata: {
        projectPath,
      },
    }));
    const records = [...semanticResults, ...projectRecords].slice(
      0,
      query.limit ?? semanticResults.length + projectRecords.length
    );

    return {
      records,
      recentProjects,
      preferences,
      recentDecisions,
      feedback: this.buildFeedbackContext({
        successfulRecords,
        failedRecords,
        agentPerformanceRecords,
        toolPerformanceRecords,
      }),
    };
  }

  async storeMemory(input: StoreMemoryInput, context: StoreMemoryContext) {
    return this.semanticMemory.storeMemory(input, context);
  }

  private buildFeedbackContext(input: {
    successfulRecords: MemorySearchResult[];
    failedRecords: MemorySearchResult[];
    agentPerformanceRecords: MemorySearchResult[];
    toolPerformanceRecords: MemorySearchResult[];
  }): PlanningFeedbackContext {
    return {
      successfulRecords: input.successfulRecords,
      failedRecords: input.failedRecords,
      successPatterns: this.extractPatterns(input.successfulRecords, true),
      failurePatterns: this.extractPatterns(input.failedRecords, false),
      agentPerformance: this.extractPerformanceSignals(
        input.agentPerformanceRecords,
        "agent"
      ),
      toolEffectiveness: this.extractPerformanceSignals(
        input.toolPerformanceRecords,
        "tool"
      ),
    };
  }

  private extractPatterns(records: MemorySearchResult[], successful: boolean) {
    const patterns: PlanningFeedbackPattern[] = [];

    for (const record of records) {
      if (record.category === "plan") {
        const stepsLine = record.content
          .split("\n")
          .find((line) => line.startsWith("Steps: "));
        if (stepsLine) {
          patterns.push({
            sourceRecordId: record.id,
            category: record.category,
            patternType: successful ? "step_structure" : "failed_plan",
            summary: stepsLine.slice("Steps: ".length),
            score: record.evaluationScore,
            relatedPlanId: this.readStringMetadata(record, "planId"),
          });
        }

        patterns.push({
          sourceRecordId: record.id,
          category: record.category,
          patternType: successful ? "successful_plan" : "failed_plan",
          summary: record.content,
          score: record.evaluationScore,
          relatedPlanId: this.readStringMetadata(record, "planId"),
        });
      }

      if (record.category === "execution") {
        const toolSequence = this.readStringMetadata(record, "toolSequence");
        if (toolSequence) {
          patterns.push({
            sourceRecordId: record.id,
            category: record.category,
            patternType: successful ? "tool_sequence" : "failed_plan",
            summary: toolSequence,
            score: record.evaluationScore,
            relatedPlanId: this.readStringMetadata(record, "relatedPlanId"),
            relatedExecutionId: this.readStringMetadata(record, "runId"),
          });
        }
      }

      if (record.category === "performance") {
        const entityName = this.readStringMetadata(record, "entityName");
        const entityType = this.readStringMetadata(record, "entityType");
        if (entityName && entityType === "agent") {
          patterns.push({
            sourceRecordId: record.id,
            category: record.category,
            patternType: "agent_usage",
            summary: `${entityName}: ${record.content}`,
            score: record.evaluationScore,
            relatedPlanId: this.readStringMetadata(record, "relatedPlanId"),
            relatedExecutionId: this.readStringMetadata(record, "runId"),
          });
        }
      }
    }

    return patterns
      .sort((left, right) => right.score - left.score)
      .slice(0, 6);
  }

  private extractPerformanceSignals(
    records: MemorySearchResult[],
    entityType: "agent" | "tool"
  ) {
    const signals: PlanningPerformanceSignal[] = [];

    for (const record of records) {
      const entityName = this.readStringMetadata(record, "entityName");
      const successRate = this.readNumberMetadata(record, "successRate");
      const sampleSize =
        this.readNumberMetadata(record, entityType === "agent" ? "totalSteps" : "totalCalls") ?? 0;

      if (!entityName || successRate === null) {
        continue;
      }

      signals.push({
        sourceRecordId: record.id,
        entityType,
        entityName,
        score: record.score,
        successRate,
        sampleSize,
        averageDurationMs: this.readNumberMetadata(record, "averageDurationMs") ?? undefined,
      });
    }

    return signals.sort((left, right) => right.score - left.score);
  }

  private readStringMetadata(record: MemoryRecord, key: string) {
    const value = record.metadata[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private readNumberMetadata(record: MemoryRecord, key: string) {
    const value = record.metadata[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  private async seedMemory(query: MemoryRetrievalQuery) {
    const seedKey = `${query.tenantId}:${query.projectId}`;
    if (this.seededProjects.has(seedKey)) return;

    const preferences = this.memory.getAllPreferences();
    const recentProjects = this.memory.getRecentProjects();
    const recentDecisions = this.memory.getDecisions().slice(-10);

    for (const [key, value] of Object.entries(preferences)) {
      if (value === undefined) continue;
      await this.semanticMemory.storeMemory(
        {
          id: `preference:${query.tenantId}:${key}`,
          scope: "tenant",
          category: "preference",
          content: `${key}=${String(value)}`,
          metadata: { key },
        },
        {
          tenantId: query.tenantId,
          projectId: query.projectId,
        }
      );
    }

    for (const [index, decision] of recentDecisions.entries()) {
      await this.semanticMemory.storeMemory(
        {
          id: `decision:${query.tenantId}:${index + 1}`,
          scope: "tenant",
          category: "decision",
          content: decision,
          metadata: {
            source: "local_memory_manager",
          },
        },
        {
          tenantId: query.tenantId,
          projectId: query.projectId,
        }
      );
    }

    for (const [index, projectPath] of recentProjects.entries()) {
      await this.semanticMemory.storeMemory(
        {
          id: `project:${query.tenantId}:${index + 1}`,
          scope: projectPath === query.projectPath ? "project" : "global",
          category: "plan",
          content: projectPath,
          metadata: {
            projectPath,
            source: "local_memory_manager",
          },
        },
        {
          tenantId: query.tenantId,
          projectId: projectPath === query.projectPath ? query.projectId : null,
        }
      );
    }

    this.seededProjects.add(seedKey);
  }
}
