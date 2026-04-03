require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");

test("platform readiness service module loads", async () => {
  const mod = require("../src/core/platform/PlatformReadinessService.ts");
  assert.equal(typeof mod.PlatformReadinessService, "function");
});
