require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const { TaskQueue } = require("../src/pipelines/TaskQueue.ts");
const { PhaseRisk, TaskStatus } = require("../src/types.ts");

test("task queue executa fase architecture_guarded com agente owner", async () => {
  const queue = new TaskQueue();
  const calls = [];

  const result = await queue.run(
    [
      {
        id: "t1",
        status: TaskStatus.PENDING,
        action: {
          id: "a1",
          name: "Criar layout do dashboard",
          type: "scaffold",
          risk: PhaseRisk.MEDIUM,
          execute: async (context) => {
            calls.push(context);
          },
        },
      },
    ],
    {
      phase: "dashboard",
      ownerAgent: "Architecture",
      executionMode: "architecture_guarded",
      verdict: "attention",
      notes: ["validar estrutura"],
    }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].ownerAgent, "Architecture");
  assert.equal(result.executedBy, "Architecture");
  assert.equal(result.mode, "architecture_guarded");
  assert.equal(result.logs.some((item) => item.startsWith("guard:Architecture")), true);
});

test("task queue bloqueia shell moderado em fase governance_guarded", async () => {
  const queue = new TaskQueue();

  await assert.rejects(
    queue.run(
      [
        {
          id: "t2",
          status: TaskStatus.PENDING,
          action: {
            id: "a2",
            name: "Executar migração sensível",
            type: "shell",
            risk: PhaseRisk.MEDIUM,
            execute: async () => {},
          },
        },
      ],
      {
        phase: "governance-review",
        ownerAgent: "Governance",
        executionMode: "governance_guarded",
        verdict: "blocked",
        notes: ["aprovação humana necessária"],
      }
    ),
    /Política de governança bloqueou comando shell sem aprovação granular/
  );
});
