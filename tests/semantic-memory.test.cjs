require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  SemanticMemoryService,
} = require("../src/core/memory/SemanticMemoryService.ts");
const {
  InMemoryVectorStore,
} = require("../src/core/memory/InMemoryVectorStore.ts");
const {
  DeterministicEmbeddingModel,
} = require("../src/core/memory/DeterministicEmbeddingModel.ts");
const {
  LocalMemoryRetrieval,
} = require("../src/core/planning/adapters/LocalMemoryRetrieval.ts");
const { MemoryManager } = require("../src/core/memory/MemoryManager.ts");

test("semantic memory retrieves project, tenant, and global context with tenant isolation", async () => {
  const service = new SemanticMemoryService(
    new InMemoryVectorStore(),
    new DeterministicEmbeddingModel()
  );

  await service.storeMemory(
    {
      id: "project-plan",
      scope: "project",
      category: "plan",
      content: "dashboard implementation plan with analytics widgets",
      metadata: { source: "planner" },
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  await service.storeMemory(
    {
      id: "tenant-decision",
      scope: "tenant",
      category: "decision",
      content: "tenant prefers strict governance approval for production changes",
      metadata: { source: "governance" },
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  await service.storeMemory(
    {
      id: "global-preference",
      scope: "global",
      category: "preference",
      content: "global policy requires audit logs for deployment pipelines",
      metadata: { source: "policy" },
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  await service.storeMemory(
    {
      id: "other-tenant",
      scope: "tenant",
      category: "decision",
      content: "other tenant uses ecommerce flows",
      metadata: { source: "planner" },
    },
    { tenantId: "tenant-b", projectId: "project-9" }
  );

  const results = await service.retrieveRelevantMemory({
    query: "strict governance approval and dashboard analytics",
    tenantId: "tenant-a",
    projectId: "project-1",
    topK: 5,
  });

  assert.equal(results.some((record) => record.id === "project-plan"), true);
  assert.equal(results.some((record) => record.id === "tenant-decision"), true);
  assert.equal(results.some((record) => record.id === "global-preference"), true);
  assert.equal(results.some((record) => record.id === "other-tenant"), false);
});

test("semantic memory filters by category", async () => {
  const service = new SemanticMemoryService(
    new InMemoryVectorStore(),
    new DeterministicEmbeddingModel()
  );

  await service.storeMemory(
    {
      id: "execution-1",
      scope: "project",
      category: "execution",
      content: "execution result for dashboard build and deployment",
      metadata: {},
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  await service.storeMemory(
    {
      id: "plan-1",
      scope: "project",
      category: "plan",
      content: "plan for dashboard build and deployment",
      metadata: {},
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  const results = await service.retrieveRelevantMemory({
    query: "dashboard deployment",
    tenantId: "tenant-a",
    projectId: "project-1",
    categories: ["execution"],
    topK: 5,
  });

  assert.deepEqual(results.map((record) => record.category), ["execution"]);
  assert.deepEqual(results.map((record) => record.id), ["execution-1"]);
});

test("feedback-aware retrieval surfaces high-score successes, failures, and performance signals", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-memory-"));
  const retrieval = new LocalMemoryRetrieval(new MemoryManager(tempDir));

  await retrieval.storeMemory(
    {
      id: "plan-success",
      scope: "project",
      category: "plan",
      content:
        "Objective: ship auth\nSteps: 1. Review boundary [Architecture/analysis] -> Notes | 2. Configure auth [Developer/modification] -> Auth ready",
      metadata: {
        planId: "plan-success",
        score: 0.91,
      },
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  await retrieval.storeMemory(
    {
      id: "execution-failure",
      scope: "project",
      category: "execution",
      content: "Execution failed on repeated shell migration attempts",
      metadata: {
        runId: "run-failure",
        relatedPlanId: "plan-failure",
        score: 0.22,
        toolSequence: "shell -> shell -> shell",
      },
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  await retrieval.storeMemory(
    {
      id: "agent-performance",
      scope: "project",
      category: "performance",
      content: "Agent: Developer\nCompleted steps: 9/10",
      metadata: {
        entityType: "agent",
        entityName: "Developer",
        successRate: 0.9,
        totalSteps: 10,
        score: 0.9,
      },
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  await retrieval.storeMemory(
    {
      id: "tool-performance",
      scope: "project",
      category: "performance",
      content: "Tool: file_read\nSuccessful calls: 30/30",
      metadata: {
        entityType: "tool",
        entityName: "file_read",
        successRate: 1,
        totalCalls: 30,
        averageDurationMs: 2,
        score: 1,
      },
    },
    { tenantId: "tenant-a", projectId: "project-1" }
  );

  const context = await retrieval.retrieve({
    tenantId: "tenant-a",
    projectId: "project-1",
    projectPath: "/tmp/project-1",
    objective: {
      raw: "Improve auth rollout",
      normalized: "improve auth rollout",
      intent: "plan",
      dryRun: true,
      projectPath: "/tmp/project-1",
    },
  });

  assert.equal(context.feedback.successfulRecords.some((record) => record.id === "plan-success"), true);
  assert.equal(context.feedback.failedRecords.some((record) => record.id === "execution-failure"), true);
  assert.equal(
    context.feedback.successPatterns.some((pattern) => pattern.patternType === "step_structure"),
    true
  );
  assert.equal(
    context.feedback.failurePatterns.some((pattern) => pattern.summary.includes("shell")),
    true
  );
  assert.equal(context.feedback.agentPerformance[0].entityName, "Developer");
  assert.equal(context.feedback.toolEffectiveness[0].entityName, "file_read");
});
