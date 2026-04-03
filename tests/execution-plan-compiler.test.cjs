require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ExecutionPlanCompiler,
  ExecutionPlanCompilerError,
} = require("../src/core/execution/ExecutionPlanCompiler.ts");

function createPlan(overrides = {}) {
  return {
    objective: {
      raw: "Implement auth and dashboard",
      normalized: "implement auth and dashboard",
      intent: "execute",
      dryRun: false,
      projectPath: "/tmp/project",
    },
    project: {
      id: "project-1",
      name: "maestro",
      rootPath: "/tmp/project",
      currentPhase: "scan",
    },
    goals: ["Implement auth", "Implement dashboard"],
    steps: [
      {
        id: "step-1",
        title: "Review architecture",
        summary: "Review project architecture before changes.",
        phase: "architecture-review",
        type: "analysis",
        order: 1,
        agent: "Architecture",
        dependencies: [],
        risk: "LOW",
        expectedOutput: "Architecture review notes",
      },
      {
        id: "step-2",
        title: "Configure auth",
        summary: "Configure auth integration.",
        phase: "auth-config",
        type: "modification",
        order: 2,
        agent: "Developer",
        dependencies: ["step-1"],
        risk: "MEDIUM",
        expectedOutput: "Auth configuration applied",
      },
    ],
    agentsRequired: ["Architecture", "Developer"],
    dependencies: [
      { stepId: "step-1", dependsOn: [] },
      { stepId: "step-2", dependsOn: ["step-1"] },
    ],
    risks: [],
    confidence: 0.82,
    reasoningSummary: "Architecture review should happen first. Auth setup follows.",
    jobs: [],
    phases: [],
    summary: {
      totalJobs: 0,
      totalTasks: 0,
      highRiskCount: 0,
    },
    metadata: {},
    ...overrides,
  };
}

test("execution plan compiler produces ordered executable steps", () => {
  const compiler = new ExecutionPlanCompiler();
  const executionPlan = compiler.compile({
    tenantId: "tenant-1",
    plan: createPlan(),
    risks: [],
  });

  assert.deepEqual(executionPlan.executionOrder, ["step-1", "step-2"]);
  assert.equal(executionPlan.executableSteps[1].dependencies[0], "step-1");
  assert.deepEqual(executionPlan.agentAssignments, {
    Architecture: ["step-1"],
    Developer: ["step-2"],
  });
});

test("execution plan compiler fails on unknown agent", () => {
  const compiler = new ExecutionPlanCompiler();

  assert.throws(
    () =>
      compiler.compile({
        tenantId: "tenant-1",
        plan: createPlan({
          steps: [
            {
              id: "step-1",
              title: "Unknown agent step",
              summary: "Should fail.",
              phase: "init",
              type: "analysis",
              order: 1,
              agent: "UnknownAgent",
              dependencies: [],
              risk: "LOW",
              expectedOutput: "none",
            },
          ],
          dependencies: [{ stepId: "step-1", dependsOn: [] }],
        }),
        risks: [],
      }),
    ExecutionPlanCompilerError
  );
});
