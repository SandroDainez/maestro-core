require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const { SaaSPlanner } = require("../src/core/planner/SaaSPlanner.ts");
const { ProjectRegistry } = require("../src/core/projects/ProjectRegistry.ts");

function createProjectRegistry() {
  const registry = new ProjectRegistry();
  registry.registerProject({
    id: "proj-1",
    name: "proj",
    rootPath: process.cwd(),
    currentPhase: "scan",
    createdAt: new Date(),
  });
  registry.setActiveProject("proj-1");
  return registry;
}

test("planner adiciona governance review com risco alto", () => {
  const planner = new SaaSPlanner(createProjectRegistry());
  const jobs = planner.plan(
    {
      hasNext: true,
      hasPrisma: true,
      hasSupabase: false,
      stack: ["next", "git"],
      scripts: ["dev"],
      packageName: "maestro-core",
      packageManager: "npm",
    },
    [
      {
        id: "high-risk",
        risk: "HIGH",
        title: "High risk",
        detail: "Needs approval",
      },
    ],
    {
      preferences: {},
      recentProjects: [],
      recentDecisions: [],
    }
  );

  assert.equal(jobs.some((job) => job.phase === "governance-review"), true);
});

test("planner adiciona architecture review com memoria rica", () => {
  const planner = new SaaSPlanner(createProjectRegistry());
  const jobs = planner.plan(
    {
      hasNext: true,
      hasPrisma: true,
      hasSupabase: false,
      stack: ["next", "git"],
      scripts: ["dev"],
      packageName: "maestro-core",
      packageManager: "npm",
    },
    [],
    {
      preferences: { codingStyle: "strict", defaultDomain: "saas" },
      recentProjects: ["a", "b", "c"],
      recentDecisions: [],
    }
  );

  assert.equal(jobs.some((job) => job.phase === "architecture-review"), true);
});
