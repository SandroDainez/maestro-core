require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const { hasRequiredRole, isAdminRole, normalizeRole } = require("../src/lib/rbac.ts");

test("normaliza papeis desconhecidos para member", () => {
  assert.equal(normalizeRole("something-else"), "member");
});

test("reconhece admin e owner como papeis administrativos", () => {
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("owner"), true);
  assert.equal(isAdminRole("member"), false);
});

test("compara hierarquia de papeis corretamente", () => {
  assert.equal(hasRequiredRole("owner", "admin"), true);
  assert.equal(hasRequiredRole("manager", "admin"), false);
});
