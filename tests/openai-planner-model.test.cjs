require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OpenAIPlannerModel,
  PlannerModelError,
} = require("../src/infrastructure/ai/OpenAIPlannerModel.ts");

function createContext() {
  return {
    tenantId: "tenant-1",
    objective: {
      raw: "Plan auth and dashboard",
      normalized: "plan auth and dashboard",
      intent: "plan",
      dryRun: true,
      projectPath: "/tmp/project",
    },
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
      stack: ["next", "prisma", "git"],
      scripts: ["dev"],
      packageName: "maestro-core",
      packageManager: "npm",
    },
    risks: [],
    memory: {
      records: [],
      recentProjects: ["/tmp/project"],
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
  };
}

function mockResponse(ok, payload, status = 200) {
  return {
    ok,
    status,
    json: async () => payload,
  };
}

test("openai planner model retries on invalid output and returns validated plan", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return mockResponse(true, {
        choices: [{ message: { content: "not-json" } }],
      });
    }

    return mockResponse(true, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              goals: ["Plan auth and dashboard"],
              steps: [
                {
                  id: "step-1",
                  title: "Initialize baseline",
                  summary: "Analyze current project baseline.",
                  phase: "init",
                  type: "analysis",
                  order: 1,
                  agent: "Architecture",
                  dependencies: [],
                  risk: "LOW",
                  expectedOutput: "Baseline analysis ready",
                },
                {
                  id: "step-2",
                  title: "Configure dashboard",
                  summary: "Prepare dashboard implementation.",
                  phase: "dashboard",
                  type: "generation",
                  order: 2,
                  agent: "Developer",
                  dependencies: ["step-1"],
                  risk: "MEDIUM",
                  expectedOutput: "Dashboard execution plan",
                },
              ],
              agentsRequired: ["Ignored"],
              dependencies: [
                { stepId: "step-1", dependsOn: [] },
                { stepId: "step-2", dependsOn: ["step-1"] },
              ],
              risks: [],
              confidence: 0.76,
              reasoningSummary:
                "The baseline must be understood first. Dashboard work should follow the initial analysis.",
            }),
          },
        },
      ],
    });
  };

  const model = new OpenAIPlannerModel({
    apiKey: "test-key",
    fetchImpl,
    maxRetries: 2,
  });

  const plan = await model.generatePlan(createContext());

  assert.equal(calls, 2);
  assert.equal(plan.goals[0], "Plan auth and dashboard");
  assert.deepEqual(plan.agentsRequired, ["Architecture", "Developer"]);
  assert.equal(plan.jobs.length, 2);
});

test("openai planner model throws when retries are exhausted", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return mockResponse(true, {
      choices: [{ message: { content: "still-invalid" } }],
    });
  };

  const model = new OpenAIPlannerModel({
    apiKey: "test-key",
    fetchImpl,
    maxRetries: 2,
  });

  await assert.rejects(() => model.generatePlan(createContext()), PlannerModelError);
  assert.equal(calls, 3);
});

test("openai planner model injects feedback context into prompt payload", async () => {
  let requestBody = null;
  const fetchImpl = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return mockResponse(true, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              goals: ["Plan auth and dashboard"],
              steps: [
                {
                  id: "step-1",
                  title: "Use successful auth pattern",
                  summary: "Reuse validated pattern.",
                  phase: "auth-config",
                  type: "modification",
                  order: 1,
                  agent: "Developer",
                  dependencies: [],
                  risk: "LOW",
                  expectedOutput: "Auth config prepared",
                },
              ],
              agentsRequired: ["Developer"],
              dependencies: [{ stepId: "step-1", dependsOn: [] }],
              risks: [],
              confidence: 0.9,
              reasoningSummary: "Use high-score patterns and avoid failed ones.",
            }),
          },
        },
      ],
    });
  };

  const model = new OpenAIPlannerModel({
    apiKey: "test-key",
    fetchImpl,
  });
  const context = createContext();
  context.memory.feedback.successPatterns.push({
    sourceRecordId: "plan-1",
    category: "plan",
    patternType: "step_structure",
    summary: "1. Review auth boundary | 2. Configure auth | 3. Validate flows",
    score: 0.93,
    relatedPlanId: "plan-1",
  });
  context.memory.feedback.failurePatterns.push({
    sourceRecordId: "exec-1",
    category: "execution",
    patternType: "tool_sequence",
    summary: "shell -> shell -> shell",
    score: 0.21,
    relatedExecutionId: "run-1",
  });

  await model.generatePlan(context);

  const userMessage = requestBody.messages.find((message) => message.role === "user");
  const payload = JSON.parse(userMessage.content);

  assert.equal(
    payload.memory.feedback.successPatterns[0].summary.includes("Configure auth"),
    true
  );
  assert.equal(
    payload.memory.feedback.failurePatterns[0].summary.includes("shell"),
    true
  );
});
