require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");

const { PlanningService } = require("../src/core/planning/PlanningService.ts");
const { ExecutionRuntime } = require("../src/core/execution/ExecutionRuntime.ts");
const { AgentRegistry } = require("../src/agents/AgentRegistry.ts");

function createPlanningInput() {
  return {
    tenantId: "tenant-1",
    project: {
      id: "project-1",
      name: "maestro",
      rootPath: "/tmp/project",
      currentPhase: "scan",
      createdAt: new Date(),
    },
    objective: {
      raw: "Ship dashboard",
      normalized: "ship dashboard",
      intent: "plan",
      dryRun: true,
      projectPath: "/tmp/project",
    },
    scan: {
      hasNext: true,
      hasPrisma: true,
      hasSupabase: false,
      stack: ["next", "prisma"],
      scripts: ["dev"],
      packageName: "maestro-core",
      packageManager: "npm",
    },
    risks: [],
  };
}

function createPlan() {
  return {
    objective: {
      raw: "Ship dashboard",
      normalized: "ship dashboard",
      intent: "plan",
      dryRun: true,
      projectPath: "/tmp/project",
    },
    project: {
      id: "project-1",
      name: "maestro",
      rootPath: "/tmp/project",
      currentPhase: "scan",
    },
    goals: ["Deliver dashboard"],
    steps: [
      {
        id: "step-1",
        title: "Review architecture",
        summary: "Review architecture",
        phase: "architecture-review",
        type: "analysis",
        order: 1,
        agent: "Architecture",
        dependencies: [],
        risk: "LOW",
        expectedOutput: "Architecture notes",
      },
    ],
    agentsRequired: ["Architecture"],
    dependencies: [{ stepId: "step-1", dependsOn: [] }],
    risks: [],
    confidence: 0.92,
    reasoningSummary: "Review first.",
    jobs: [],
    phases: [],
    summary: {
      totalJobs: 0,
      totalTasks: 0,
      highRiskCount: 0,
    },
    metadata: {
      planId: "plan-123",
    },
  };
}

function createMemoryIndexer() {
  const records = [];
  return {
    records,
    async storeMemory(input, context) {
      records.push({ input, context });
      return {
        id: input.id ?? `memory-${records.length}`,
        tenantId: context.tenantId,
        projectId: context.projectId ?? null,
        scope: input.scope,
        category: input.category,
        content: input.content,
        embedding: [],
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  };
}

test("planning service stores linked plan and evaluation feedback", async () => {
  const memoryIndexer = createMemoryIndexer();
  const service = new PlanningService(
    {
      async generatePlan() {
        return createPlan();
      },
    },
    {
      async retrieve() {
        return {
          records: [],
          recentProjects: [],
          preferences: {},
          recentDecisions: [],
          feedback: {
            successfulRecords: [],
            failedRecords: [],
            successPatterns: [],
            failurePatterns: [],
            agentPerformance: [],
            toolEffectiveness: [],
          },
        };
      },
    },
    undefined,
    memoryIndexer,
    {
      evaluate({ plan }) {
        return {
          id: "eval-plan-1",
          type: "plan",
          createdAt: "2026-04-02T00:00:00.000Z",
          score: 0.93,
          issues: [],
          suggestions: ["Keep current decomposition."],
          relatedPlanId: plan.metadata.planId,
          dimensions: {
            coherence: 1,
            completeness: 1,
          },
          metadata: {},
        };
      },
    }
  );

  await service.createPlan(createPlanningInput());

  assert.equal(memoryIndexer.records.length, 2);
  assert.equal(memoryIndexer.records[0].input.category, "evaluation");
  assert.equal(memoryIndexer.records[0].input.metadata.relatedPlanId, "plan-123");
  assert.equal(memoryIndexer.records[1].input.category, "plan");
  assert.equal(memoryIndexer.records[1].input.metadata.evaluationId, "eval-plan-1");
});

test("planning service generates multiple candidate plans and selects the best one", async () => {
  const generatedCandidates = [];
  const service = new PlanningService(
    {
      async generatePlan(_context, options) {
        generatedCandidates.push(options);
        const candidateIndex = options?.candidateIndex ?? 0;
        return {
          ...createPlan(),
          goals: [`Deliver dashboard variant ${candidateIndex + 1}`],
          steps: [
            {
              ...createPlan().steps[0],
              id: `step-${candidateIndex + 1}`,
              title:
                candidateIndex === 1
                  ? "Use validated auth boundary"
                  : candidateIndex === 2
                  ? "Repeat shell-heavy rollout"
                  : "Review architecture",
              summary:
                candidateIndex === 1
                  ? "Reuse the validated auth rollout."
                  : candidateIndex === 2
                  ? "Repeat shell-heavy rollout."
                  : "Review architecture.",
              expectedOutput:
                candidateIndex === 1
                  ? "Validated auth rollout"
                  : candidateIndex === 2
                  ? "Shell migration chain"
                  : "Architecture notes",
              phase: candidateIndex === 1 ? "auth-config" : "architecture-review",
              agent: candidateIndex === 1 ? "Developer" : "Architecture",
            },
          ],
          metadata: {
            planId: `plan-${candidateIndex + 1}`,
          },
        };
      },
    },
    {
      async retrieve() {
        return {
          records: [],
          recentProjects: [],
          preferences: {},
          recentDecisions: [],
          feedback: {
            successfulRecords: [],
            failedRecords: [],
            successPatterns: [
              {
                sourceRecordId: "memory-success",
                category: "plan",
                patternType: "step_structure",
                summary: "Developer auth-config validated auth rollout",
                score: 0.95,
                relatedPlanId: "plan-historical-success",
              },
            ],
            failurePatterns: [
              {
                sourceRecordId: "memory-failure",
                category: "execution",
                patternType: "tool_sequence",
                summary: "shell-heavy rollout shell migration chain",
                score: 0.8,
                relatedExecutionId: "run-failure",
              },
            ],
            agentPerformance: [],
            toolEffectiveness: [],
          },
        };
      },
    },
    undefined,
    undefined,
    {
      evaluate({ plan }) {
        const planId = String(plan.metadata.planId);
        const planScore =
          planId === "plan-1" ? 0.7 : planId === "plan-2" ? 0.82 : 0.79;
        return {
          id: `eval-${planId}`,
          type: "plan",
          createdAt: "2026-04-02T00:00:00.000Z",
          score: planScore,
          issues: [],
          suggestions: [],
          relatedPlanId: planId,
          dimensions: {
            coherence: planScore,
          },
          metadata: {},
        };
      },
    }
  );

  const result = await service.createPlan(createPlanningInput());

  assert.equal(generatedCandidates.length, 3);
  assert.deepEqual(
    generatedCandidates.map((item) => item.candidateIndex),
    [0, 1, 2]
  );
  assert.equal(result.plan.metadata.planId, "plan-2");
  assert.equal(result.plan.metadata.candidateCount, 3);
  assert.equal(result.plan.metadata.selectedCandidateId, "candidate-2");
});

test("execution runtime stores execution summary and linked evaluation feedback", async () => {
  const memoryIndexer = createMemoryIndexer();
  const registry = new AgentRegistry();
  registry.register({
    name: "Architecture",
    specialty: "analysis",
    canHandle() {
      return true;
    },
    async execute() {
      return {
        result: {
          summary: "Architecture reviewed",
        },
        logs: ["done"],
        toolUsageTrace: [
          {
            toolName: "file_read",
            status: "success",
            durationMs: 1,
            input: {},
          },
        ],
      };
    },
  });

  const runtime = new ExecutionRuntime(
    {
      async create(_runId, phase) {
        return { id: `phase-${phase}` };
      },
      async markRunning() {},
      async finish() {},
    },
    {
      agentRegistry: registry,
      memoryIndexer,
      executionEvaluator: {
        evaluate() {
          return {
            id: "eval-exec-1",
            type: "execution",
            createdAt: "2026-04-02T00:00:00.000Z",
            score: 0.88,
            issues: [],
            suggestions: ["Inspect slower agents."],
            relatedPlanId: "plan-123",
            relatedExecutionId: "run-123",
            dimensions: {
              success: 1,
              tool_usage: 1,
            },
            metadata: {},
          };
        },
      },
    }
  );

  await runtime.execute({
    runId: "run-123",
    executionPlan: {
      sourcePlan: {
        metadata: {
          planId: "plan-123",
        },
      },
      executableSteps: [
        {
          id: "step-1",
          agent: "Architecture",
          type: "analysis",
          input: {
            objective: "Ship dashboard",
            title: "Review architecture",
            summary: "Review architecture",
            phase: "architecture-review",
            risk: "LOW",
          },
          expectedOutput: "Architecture notes",
          dependencies: [],
          status: "pending",
          context: {
            tenantId: "tenant-1",
            project: {
              id: "project-1",
              name: "maestro",
              rootPath: "/tmp/project",
              currentPhase: "scan",
            },
            objective: {
              raw: "Ship dashboard",
              normalized: "ship dashboard",
              intent: "execute",
              dryRun: false,
              projectPath: "/tmp/project",
            },
            planConfidence: 0.92,
            reasoningSummary: "Review first.",
            risks: [],
            dependencyResults: {},
            step: {
              id: "step-1",
              title: "Review architecture",
              summary: "Review architecture",
              phase: "architecture-review",
              risk: "LOW",
              agent: "Architecture",
              type: "analysis",
            },
          },
        },
      ],
      executionOrder: ["step-1"],
      agentAssignments: {
        Architecture: ["step-1"],
      },
      metadata: {
        compiledAt: "2026-04-02T00:00:00.000Z",
        totalSteps: 1,
        confidence: 0.92,
      },
    },
  });

  const executionRecord = memoryIndexer.records.find(
    (entry) => entry.input.id === "execution-summary:run-123"
  );
  const evaluationRecord = memoryIndexer.records.find(
    (entry) => entry.input.id === "evaluation:eval-exec-1"
  );
  const performanceRecord = memoryIndexer.records.find(
    (entry) => entry.input.category === "performance"
  );

  assert.ok(executionRecord);
  assert.equal(executionRecord.input.metadata.relatedPlanId, "plan-123");
  assert.equal(executionRecord.input.metadata.evaluationId, "eval-exec-1");
  assert.ok(evaluationRecord);
  assert.equal(evaluationRecord.input.metadata.relatedExecutionId, "run-123");
  assert.ok(performanceRecord);
  assert.equal(performanceRecord.input.metadata.evaluationId, "eval-exec-1");
});
