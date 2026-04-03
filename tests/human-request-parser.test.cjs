require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const { HumanRequestParser } = require("../src/core/orchestration/HumanRequestParser.ts");

test("interpreta pedido de execucao em linguagem humana", () => {
  const parser = new HumanRequestParser();
  const parsed = parser.parse("execute o autopilot completo neste projeto", ".");

  assert.equal(parsed.intent, "execute");
  assert.equal(parsed.dryRun, false);
});

test("interpreta pedido de analise sem execucao", () => {
  const parser = new HumanRequestParser();
  const parsed = parser.parse("apenas analise este projeto e gere um plano", ".");

  assert.equal(parsed.intent, "plan");
  assert.equal(parsed.dryRun, true);
});
