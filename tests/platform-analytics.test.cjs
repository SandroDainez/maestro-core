require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildOperationalAnalytics,
} = require("../src/core/platform/OperationalAnalyticsService.ts");

test("operational analytics agrega runners e guards do resumo estruturado", () => {
  const analytics = buildOperationalAnalytics([
    {
      analysis: {
        multiAgentReview: { summary: "ok" },
        workflow: [
          { code: "approval", status: "blocked" },
          { code: "execute", status: "blocked" },
        ],
        operationalSummary: {
          specializedCount: 2,
          runners: ["AuthInstallRunner", "RBACRunner"],
          guards: ["Governance", "Architecture"],
          phases: [
            {
              phase: "auth-install",
              runner: "AuthInstallRunner",
              source: "specialized",
              guards: ["Governance"],
            },
            {
              phase: "rbac",
              runner: "RBACRunner",
              source: "specialized",
              guards: ["Architecture"],
            },
          ],
        },
        observability: {
          metrics: {
            successRate: 1,
            planScore: 0.82,
            executionScore: 0.91,
            agentPerformance: [
              { agent: "Developer", successRate: 1, totalSteps: 2 },
            ],
          },
          replanning: {
            count: 1,
          },
        },
        audit: {
          planVersions: [
            { planId: "plan-1", planVersion: 1 },
            { planId: "plan-2", planVersion: 2 },
          ],
          evaluations: {
            execution: { score: 0.91 },
          },
        },
      },
      startedAt: new Date("2026-03-10T10:00:00Z"),
      phaseRuns: [],
    },
  ]);

  assert.equal(analytics.totalRuns, 1);
  assert.equal(analytics.reviewedRuns, 1);
  assert.equal(analytics.approvalBlocks, 1);
  assert.equal(analytics.governanceBlockedRuns, 1);
  assert.equal(analytics.specializedRuns, 1);
  assert.equal(analytics.successRate, 1);
  assert.equal(analytics.averagePlanScore, 0.82);
  assert.equal(analytics.averageExecutionScore, 0.91);
  assert.equal(analytics.replannedRuns, 1);
  assert.equal(analytics.planVersionsTracked, 2);
  assert.equal(analytics.topAgents[0].name, "Developer");
  assert.equal(analytics.topRunners[0].name, "AuthInstallRunner");
  assert.equal(analytics.topGuards.some((item) => item.name === "Governance"), true);
  assert.equal(analytics.timeline.length, 1);
  assert.equal(analytics.timeline[0].day, "2026-03-10");
  assert.equal(analytics.timeline[0].runs, 1);
  assert.equal(analytics.periodComparison.current.runs, 1);
  assert.equal(analytics.periodComparison.delta.runs, 1);
});

test("operational analytics preserva filtros no resumo", () => {
  const analytics = buildOperationalAnalytics(
    [
      {
        analysis: {
          operationalSummary: {
            specializedCount: 1,
            phases: [
              {
                phase: "rbac",
                runner: "RBACRunner",
                source: "specialized",
                guards: ["Governance"],
              },
            ],
          },
        },
        startedAt: new Date("2026-03-11T10:00:00Z"),
        phaseRuns: [],
      },
    ],
    30,
    7,
    { runner: "RBACRunner", guard: "Governance", type: "agent" }
  );

  assert.equal(analytics.filters.runner, "RBACRunner");
  assert.equal(analytics.filters.guard, "Governance");
  assert.equal(analytics.filters.type, "agent");
});
