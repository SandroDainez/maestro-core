require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  handleAutopilotScanRequest,
  handleAutopilotRunRequest,
} = require("../src/server/handlers/autopilot.ts");
const {
  handleMaestroObjectiveRequest,
} = require("../src/server/handlers/maestro.ts");

async function readJson(response) {
  return JSON.parse(await response.text());
}

test("autopilot scan handler valida body", async () => {
  const req = new Request("http://localhost/api/autopilot/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  const response = await handleAutopilotScanRequest(req, {
    scanProject: async () => {
      throw new Error("nao deve ser chamado");
    },
  });
  const json = await readJson(response);

  assert.equal(response.status, 400);
  assert.equal(json.ok, false);
});

test("autopilot scan handler retorna sucesso", async () => {
  const req = new Request("http://localhost/api/autopilot/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: "." }),
  });

  const response = await handleAutopilotScanRequest(req, {
    scanProject: async (path) => ({ intent: "scan", path }),
  });
  const json = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.result.intent, "scan");
});

test("autopilot run handler repassa autoExecute", async () => {
  const req = new Request("http://localhost/api/autopilot/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: ".",
      autoExecute: false,
      approved: true,
      approvedPhases: ["governance-review"],
      actor: "tester",
    }),
  });

  let captured = null;
  const response = await handleAutopilotRunRequest(req, {
    runProject: async (path, autoExecute, approved, approvedPhases, actor) => {
      captured = { path, autoExecute, approved, approvedPhases, actor };
      return { intent: "execute", execution: { status: "planned" } };
    },
  });
  const json = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(captured, {
    path: ".",
    autoExecute: false,
    approved: true,
    approvedPhases: ["governance-review"],
    actor: "tester",
  });
  assert.equal(json.result.execution.status, "planned");
});

test("maestro objective handler aceita request humana", async () => {
  const req = new Request("http://localhost/api/maestro/objective", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ request: "analise este projeto", path: "." }),
  });

  const response = await handleMaestroObjectiveRequest(req, {
    handleHumanRequest: async (input) => ({
      intent: "plan",
      original: input.request,
    }),
  });
  const json = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(json.result.intent, "plan");
  assert.equal(json.result.original, "analise este projeto");
});
