require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");

const { ToolRegistry } = require("../src/tools/ToolRegistry.ts");
const { FileWriteTool } = require("../src/tools/file-tools.ts");
const { ShellCommandTool } = require("../src/tools/shell-tool.ts");

test("tool registry enforces max tool calls per step", async () => {
  const registry = new ToolRegistry();
  registry.register({
    name: "noop",
    inputSchema: { parse: (value) => value },
    outputSchema: { parse: (value) => value },
    async execute() {
      return { ok: true };
    },
  });

  await registry.invoke("noop", {}, {
    projectRoot: "/tmp/project",
    stepId: "step-1",
    limits: {
      maxToolCalls: 1,
    },
  });

  await assert.rejects(
    () =>
      registry.invoke("noop", {}, {
        projectRoot: "/tmp/project",
        stepId: "step-1",
        limits: {
          maxToolCalls: 1,
        },
      }),
    /Tool call limit exceeded/
  );
});

test("file write tool blocks protected paths", async () => {
  await assert.rejects(
    () =>
      FileWriteTool.execute(
        {
          path: ".env",
          content: "SECRET=true",
        },
        {
          projectRoot: "/tmp/project",
          sandbox: {
            writableRoots: ["/tmp/project"],
            protectedPaths: [".env"],
          },
        }
      ),
    /protected path policy/
  );
});

test("shell tool blocks destructive commands by default", async () => {
  await assert.rejects(
    () =>
      ShellCommandTool.execute(
        {
          command: "rm",
          args: ["-rf", "tmp"],
        },
        {
          projectRoot: "/tmp/project",
          guardrails: {
            allowDestructiveCommands: false,
          },
        }
      ),
    /Destructive shell command blocked/
  );
});
