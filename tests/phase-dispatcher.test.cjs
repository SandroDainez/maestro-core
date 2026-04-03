require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const {
  PhaseExecutionDispatcher,
} = require("../src/core/phases/PhaseExecutionDispatcher.ts");
const { ProjectRegistry } = require("../src/core/projects/ProjectRegistry.ts");
const { TaskStatus, PhaseRisk } = require("../src/types.ts");

function makeRegistry() {
  const registry = new ProjectRegistry();
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-dispatch-"));
  const project = {
    id: `proj-${Date.now()}`,
    name: "tmp",
    rootPath,
    currentPhase: "scan",
    createdAt: new Date(),
  };
  registry.registerProject(project);
  registry.setActiveProject(project.id);
  return registry;
}

test("dispatcher resolve auth-install para runner especializado", () => {
  const dispatcher = new PhaseExecutionDispatcher(makeRegistry());
  const result = dispatcher.resolve({
    id: "auth-install",
    phase: "auth-install",
    tasks: [],
  });

  assert.equal(result.runner, "AuthInstallRunner");
  assert.equal(result.specialized, true);
  assert.equal(result.tasks.length > 0, true);
  assert.equal(result.tasks[0].status, TaskStatus.PENDING);
});

test("dispatcher resolve rbac para runner especializado", () => {
  const dispatcher = new PhaseExecutionDispatcher(makeRegistry());
  const result = dispatcher.resolve({
    id: "rbac",
    phase: "rbac",
    tasks: [],
  });

  assert.equal(result.runner, "RBACRunner");
  assert.equal(result.specialized, true);
  assert.equal(
    result.tasks.some((task) => task.action.risk === PhaseRisk.MEDIUM),
    true
  );
});

test("dispatcher preserva job planejado para fase desconhecida", () => {
  const dispatcher = new PhaseExecutionDispatcher(makeRegistry());
  const plannedTasks = [
    {
      id: "custom:t1",
      status: TaskStatus.PENDING,
      action: {
        id: "t1",
        name: "Custom task",
        type: "custom",
        risk: PhaseRisk.LOW,
        execute: async () => {},
      },
    },
  ];

  const result = dispatcher.resolve({
    id: "custom",
    phase: "custom-phase",
    tasks: plannedTasks,
  });

  assert.equal(result.runner, "PlannedJobTasks");
  assert.equal(result.specialized, false);
  assert.equal(result.tasks, plannedTasks);
});
