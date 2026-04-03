require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RuleBasedPlanEvaluator,
} = require("../src/core/evaluation/RuleBasedPlanEvaluator.ts");
const {
  RuleBasedExecutionEvaluator,
} = require("../src/core/evaluation/RuleBasedExecutionEvaluator.ts");

test("plan evaluator scores coherent plan highly", () => {
  const evaluator = new RuleBasedPlanEvaluator();

  const evaluation = evaluator.evaluate({
    context: {
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
      memory: {
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
      },
    },
    plan: {
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
          summary: "Inspect architecture.",
          phase: "architecture-review",
          type: "analysis",
          order: 1,
          agent: "Architecture",
          dependencies: [],
          risk: "LOW",
          expectedOutput: "Architecture notes",
        },
        {
          id: "step-2",
          title: "Build dashboard",
          summary: "Implement dashboard.",
          phase: "dashboard",
          type: "generation",
          order: 2,
          agent: "Developer",
          dependencies: ["step-1"],
          risk: "MEDIUM",
          expectedOutput: "Dashboard delivered",
        },
      ],
      agentsRequired: ["Architecture", "Developer"],
      dependencies: [
        { stepId: "step-1", dependsOn: [] },
        { stepId: "step-2", dependsOn: ["step-1"] },
      ],
      risks: [
        {
          id: "risk-1",
          level: "MEDIUM",
          title: "Delivery risk",
          summary: "Dashboard implementation needs validation.",
        },
      ],
      confidence: 0.8,
      reasoningSummary: "Review first. Build second.",
      jobs: [],
      phases: [],
      summary: {
        totalJobs: 0,
        totalTasks: 0,
        highRiskCount: 0,
      },
      metadata: {
        planId: "plan-1",
      },
    },
  });

  assert.equal(evaluation.type, "plan");
  assert.equal(typeof evaluation.id, "string");
  assert.equal(evaluation.relatedPlanId, "plan-1");
  assert.equal(typeof evaluation.createdAt, "string");
  assert.equal(evaluation.score >= 0.8, true);
  assert.equal(evaluation.dimensions.completeness >= 0.75, true);
  assert.equal(evaluation.issues.length, 0);
});

test("execution evaluator reports score and related ids", () => {
  const evaluator = new RuleBasedExecutionEvaluator();

  const evaluation = evaluator.evaluate({
    runId: "run-1",
    executionPlan: {
      sourcePlan: {
        metadata: {
          planId: "plan-1",
        },
      },
    },
    completedSteps: [
      {
        status: "completed",
        result: {
          result: {
            summary: "Done",
          },
          logs: [],
          toolUsageTrace: [
            { toolName: "file_read", status: "success", durationMs: 1, input: {} },
          ],
        },
      },
      {
        status: "failed",
        error: {
          message: "boom",
          retryable: false,
        },
        result: {
          result: {},
          logs: [],
          toolUsageTrace: [
            { toolName: "shell_exec", status: "failed", durationMs: 2, input: {}, error: "boom" },
          ],
        },
      },
    ],
  });

  assert.equal(evaluation.type, "execution");
  assert.equal(typeof evaluation.id, "string");
  assert.equal(evaluation.relatedPlanId, "plan-1");
  assert.equal(evaluation.relatedExecutionId, "run-1");
  assert.equal(typeof evaluation.createdAt, "string");
  assert.equal(evaluation.score < 1, true);
  assert.equal(evaluation.dimensions.success < 1, true);
  assert.equal(evaluation.issues.length > 0, true);
});
