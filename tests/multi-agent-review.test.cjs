require("ts-node/register/transpile-only");
const test = require("node:test");
const assert = require("node:assert/strict");
const { MultiAgentCoordinator } = require("../src/core/orchestration/MultiAgentCoordinator.ts");

test("multi-agent review sinaliza recomendacoes para riscos altos", () => {
  const coordinator = new MultiAgentCoordinator();
  const review = coordinator.reviewPlan({
    jobs: [
      { id: "init", phase: "init", tasks: [] },
      { id: "governance-review", phase: "governance-review", tasks: [] },
    ],
    risks: [
      {
        id: "r1",
        risk: "HIGH",
        title: "High risk",
        detail: "Approval required",
      },
    ],
    objective: "estabilizar a plataforma",
    recentDecisions: ["approved=false"],
  });

  assert.equal(review.participants.includes("Reviewer"), true);
  assert.equal(review.participants.includes("Governance"), true);
  assert.equal(review.recommendations.length > 0, true);
  assert.equal(review.flaggedPhases.includes("governance-review"), true);
  assert.equal(Array.isArray(review.phaseReviews), true);
  assert.equal(review.phaseReviews.length > 0, true);
  assert.equal(review.phaseReviews.some((item) => item.phase === "governance-review"), true);
  assert.equal(
    review.phaseReviews.some((item) => item.ownerAgent === "Governance"),
    true
  );
  assert.equal(
    review.phaseReviews.some(
      (item) => item.executionMode === "governance_guarded"
    ),
    true
  );
  assert.equal(
    review.phaseReviews.some((item) => item.verdict === "blocked"),
    true
  );
});
