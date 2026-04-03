require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parsePlannerOutput,
  PlannerOutputValidationError,
} = require("../src/core/planning/planner-output.parser.ts");

test("planner output parser normalizes valid output and derives agents", () => {
  const parsed = parsePlannerOutput(
    JSON.stringify({
      goals: ["Ship dashboard foundation"],
      steps: [
        {
          id: "step-1",
          title: "Initialize project baseline",
          summary: "Prepare the project foundation.",
          phase: "init",
          type: "analysis",
          order: 1,
          agent: "Architecture",
          dependencies: [],
          risk: "LOW",
          expectedOutput: "Validated baseline understanding",
        },
        {
          id: "step-2",
          title: "Configure auth integration",
          summary: "Set up auth configuration.",
          phase: "auth-config",
          type: "modification",
          order: 2,
          agent: "Developer",
          dependencies: ["step-1"],
          risk: "MEDIUM",
          expectedOutput: "Auth config ready for execution",
        },
      ],
      agentsRequired: ["WrongAgent"],
      dependencies: [
        { stepId: "step-1", dependsOn: [] },
        { stepId: "step-2", dependsOn: ["step-1"] },
      ],
      risks: [
        {
          id: "risk-1",
          level: "MEDIUM",
          title: "Auth complexity",
          summary: "Authentication requires careful validation.",
        },
      ],
      confidence: 0.84,
      reasoningSummary:
        "The project needs a stable baseline first. Authentication should come after initialization.",
    })
  );

  assert.deepEqual(parsed.agentsRequired, ["Architecture", "Developer"]);
  assert.equal(parsed.steps.length, 2);
  assert.equal(parsed.dependencies[1].stepId, "step-2");
});

test("planner output parser rejects cyclic dependencies", () => {
  assert.throws(
    () =>
      parsePlannerOutput(
        JSON.stringify({
          goals: ["Test cycle"],
          steps: [
            {
              id: "a",
              title: "A",
              summary: "A",
              phase: "init",
              type: "analysis",
              order: 1,
              agent: "Architecture",
              dependencies: ["b"],
              risk: "LOW",
              expectedOutput: "A",
            },
            {
              id: "b",
              title: "B",
              summary: "B",
              phase: "dashboard",
              type: "generation",
              order: 2,
              agent: "Developer",
              dependencies: ["a"],
              risk: "LOW",
              expectedOutput: "B",
            },
          ],
          agentsRequired: [],
          dependencies: [
            { stepId: "a", dependsOn: ["b"] },
            { stepId: "b", dependsOn: ["a"] },
          ],
          risks: [],
          confidence: 0.4,
          reasoningSummary: "A depends on B. B depends on A.",
        })
      ),
    PlannerOutputValidationError
  );
});
