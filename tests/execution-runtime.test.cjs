require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");

const { ExecutionRuntime } = require("../src/core/execution/ExecutionRuntime.ts");
const { ToolRegistry } = require("../src/tools/ToolRegistry.ts");
const { AgentRegistry } = require("../src/agents/AgentRegistry.ts");

function createExecutionPlan() {
  return {
    sourcePlan: {},
    executableSteps: [
      {
        id: "step-1",
        agent: "Architecture",
        type: "analysis",
        input: {
          objective: "Ship project",
          title: "Review architecture",
          summary: "Review architecture first",
          phase: "architecture-review",
          risk: "LOW",
        },
        expectedOutput: "Architecture review notes",
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
            raw: "Ship project",
            normalized: "ship project",
            intent: "execute",
            dryRun: false,
            projectPath: "/tmp/project",
          },
          planConfidence: 0.9,
          reasoningSummary: "Architecture review first.",
          risks: [],
          dependencyResults: {},
          step: {
            id: "step-1",
            title: "Review architecture",
            summary: "Review architecture first",
            phase: "architecture-review",
            risk: "LOW",
            agent: "Architecture",
            type: "analysis",
          },
        },
      },
      {
        id: "step-2",
        agent: "Developer",
        type: "generation",
        input: {
          objective: "Ship project",
          title: "Build dashboard",
          summary: "Build dashboard after review",
          phase: "dashboard",
          risk: "MEDIUM",
        },
        expectedOutput: "Dashboard delivered",
        dependencies: ["step-1"],
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
            raw: "Ship project",
            normalized: "ship project",
            intent: "execute",
            dryRun: false,
            projectPath: "/tmp/project",
          },
          planConfidence: 0.9,
          reasoningSummary: "Architecture review first.",
          risks: [],
          dependencyResults: {},
          step: {
            id: "step-2",
            title: "Build dashboard",
            summary: "Build dashboard after review",
            phase: "dashboard",
            risk: "MEDIUM",
            agent: "Developer",
            type: "generation",
          },
        },
      },
    ],
    executionOrder: ["step-1", "step-2"],
    agentAssignments: {
      Architecture: ["step-1"],
      Developer: ["step-2"],
    },
    metadata: {
      compiledAt: new Date().toISOString(),
      totalSteps: 2,
      confidence: 0.9,
    },
  };
}

function createPhaseRunRepo() {
  return {
    create: async (_runId, phase) => ({ id: `phase-${phase}` }),
    markRunning: async () => {},
    finish: async () => {},
  };
}

function createToolRegistry() {
  const registry = new ToolRegistry();
  registry.register({
    name: "file_read",
    inputSchema: z.object({
      path: z.string(),
      allowMissing: z.boolean().optional(),
    }),
    outputSchema: z.object({
      path: z.string(),
      exists: z.boolean(),
      content: z.string().nullable(),
    }),
    async execute(input, context) {
      return {
        path: `${context.projectRoot}/${input.path}`,
        exists: false,
        content: null,
      };
    },
  });
  registry.register({
    name: "llm_codegen",
    inputSchema: z.object({
      objective: z.string(),
      instructions: z.string(),
      contextFiles: z
        .array(
          z.object({
            path: z.string(),
            content: z.string().nullable(),
          })
        )
        .optional(),
    }),
    outputSchema: z.object({
      content: z.string(),
      model: z.string(),
    }),
    async execute() {
      return {
        content: "Generated dashboard implementation brief",
        model: "test-model",
      };
    },
  });
  registry.register({
    name: "file_write",
    inputSchema: z.object({
      path: z.string(),
      content: z.string(),
    }),
    outputSchema: z.object({
      path: z.string(),
      bytesWritten: z.number(),
    }),
    async execute(input, context) {
      return {
        path: `${context.projectRoot}/${input.path}`,
        bytesWritten: input.content.length,
      };
    },
  });
  return registry;
}

test("execution runtime executes dependent steps and stores results", async () => {
  const runtime = new ExecutionRuntime(createPhaseRunRepo(), {
    toolRegistry: createToolRegistry(),
  });
  const executionPlan = createExecutionPlan();

  const result = await runtime.execute({
    runId: "run-1",
    executionPlan,
    options: {
      parallelism: 2,
      retryLimit: 0,
      failureMode: "fail_fast",
    },
  });

  assert.equal(result.graph.completedSteps, 2);
  assert.equal(result.evaluation.type, "execution");
  assert.equal(result.evaluation.relatedExecutionId, "run-1");
  assert.equal(result.trace.nodes.length, 2);
  assert.equal(result.metrics.successRate, 1);
  assert.equal(result.control.replanningEnabled, false);
  assert.equal(executionPlan.executableSteps[0].status, "completed");
  assert.equal(executionPlan.executableSteps[1].status, "completed");
  assert.equal(
    executionPlan.executableSteps[1].context.dependencyResults["step-1"].result.summary.includes("Architecture"),
    true
  );
});

test("execution runtime replans after failure and resumes with preserved completed steps", async () => {
  const registry = new AgentRegistry();
  registry.register({
    name: "Architecture",
    specialty: "analysis",
    canHandle() {
      return true;
    },
    async execute(input) {
      return {
        result: {
          summary: `Architecture complete for ${input.step.id}`,
        },
        logs: [],
        toolUsageTrace: [],
      };
    },
  });
  registry.register({
    name: "Developer",
    specialty: "generation",
    canHandle() {
      return true;
    },
    async execute(input) {
      if (input.step.id === "step-2") {
        throw new Error("original implementation failed");
      }

      return {
        result: {
          summary: `Developer complete for ${input.step.id}`,
        },
        logs: [],
        toolUsageTrace: [],
      };
    },
  });

  let replanningCalls = 0;
  const runtime = new ExecutionRuntime(createPhaseRunRepo(), {
    agentRegistry: registry,
    planningService: {
      async createPlan() {
        replanningCalls += 1;
        return {
          context: {},
          plan: {
            objective: {
              raw: "Replanned objective",
              normalized: "replanned objective",
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
            goals: ["Recover execution"],
            steps: [
              {
                id: "repair",
                title: "Repair dashboard",
                summary: "Repair after failure",
                phase: "dashboard",
                type: "generation",
                order: 1,
                agent: "Developer",
                dependencies: [],
                risk: "LOW",
                expectedOutput: "Recovered dashboard",
              },
            ],
            agentsRequired: ["Developer"],
            dependencies: [{ stepId: "repair", dependsOn: [] }],
            risks: [],
            confidence: 0.88,
            reasoningSummary: "Recover after failure.",
            jobs: [],
            phases: [],
            summary: {
              totalJobs: 0,
              totalTasks: 0,
              highRiskCount: 0,
            },
            metadata: {
              planId: "plan-replanned",
              planVersion: 1,
            },
          },
        };
      },
    },
  });

  const executionPlan = {
    ...createExecutionPlan(),
    sourcePlan: {
      objective: {
        raw: "Ship project",
        normalized: "ship project",
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
      goals: ["Ship project"],
      steps: [
        {
          id: "step-1",
          title: "Review architecture",
          summary: "Review architecture first",
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
          title: "Build dashboard",
          summary: "Build dashboard after review",
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
      risks: [],
      confidence: 0.9,
      reasoningSummary: "Architecture then build.",
      jobs: [],
      phases: [],
      summary: {
        totalJobs: 0,
        totalTasks: 0,
        highRiskCount: 0,
      },
      metadata: {
        planId: "plan-original",
        planVersion: 1,
      },
    },
  };

  const result = await runtime.execute({
    runId: "run-replan-1",
    executionPlan,
    options: {
      parallelism: 1,
      retryLimit: 0,
      failureMode: "fail_fast",
    },
    replanning: {
      tenantId: "tenant-1",
      project: {
        id: "project-1",
        name: "maestro",
        rootPath: "/tmp/project",
        currentPhase: "scan",
        createdAt: new Date(),
      },
      scan: {
        hasNext: true,
        hasPrisma: true,
        hasSupabase: false,
        stack: ["next"],
        scripts: ["dev"],
        packageName: "maestro-core",
        packageManager: "npm",
      },
      risks: [],
      maxReplans: 2,
    },
  });

  assert.equal(replanningCalls, 1);
  assert.equal(result.graph.completedSteps, 2);
  assert.equal(result.trace.events.some((event) => event.kind === "replan"), true);
  assert.equal(result.control.replanningEnabled, true);
  assert.equal(result.replanning.count, 1);
  assert.equal(result.replanning.finalPlanId, "plan-replanned");
  assert.equal(result.replanning.finalPlanVersion, 2);
});

test("execution runtime supports manual pause and abort with rollback", async () => {
  let rollbackCalls = 0;
  const runtime = new ExecutionRuntime(createPhaseRunRepo(), {
    rollbackStrategy: {
      async rollback() {
        rollbackCalls += 1;
      },
    },
  });

  const paused = await runtime.execute({
    runId: "run-pause-1",
    executionPlan: createExecutionPlan(),
    options: {
      control: {
        shouldPause: () => true,
      },
    },
  });

  assert.equal(paused.graph.completedSteps, 0);

  const aborted = await runtime.execute({
    runId: "run-abort-1",
    executionPlan: createExecutionPlan(),
    options: {
      control: {
        shouldAbort: () => true,
      },
    },
  });

  assert.equal(aborted.graph.completedSteps, 0);
  assert.equal(rollbackCalls, 1);
});
