import { randomUUID } from "crypto";

import type { PlanEvaluator, PlanEvaluationInput, EvaluationIssue, EvaluationRecord } from "./types";

function clampScore(score: number) {
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

export class RuleBasedPlanEvaluator implements PlanEvaluator {
  evaluate(input: PlanEvaluationInput): EvaluationRecord {
    const { plan, context } = input;
    const issues: EvaluationIssue[] = [];
    const suggestions = new Set<string>();

    const completenessChecks = [
      plan.goals.length > 0,
      plan.steps.length > 0,
      plan.steps.every((step) => step.expectedOutput.trim().length > 0),
      plan.agentsRequired.length > 0,
    ];
    const completeness =
      completenessChecks.filter(Boolean).length / completenessChecks.length;
    if (completeness < 1) {
      issues.push({
        code: "plan_incomplete",
        message: "Plan is missing goals, steps, expected outputs, or agent assignments.",
        severity: "high",
      });
      suggestions.add("Ensure each plan defines goals, executable steps, expected outputs, and agent ownership.");
    }

    const stepOrders = plan.steps.map((step) => step.order).sort((a, b) => a - b);
    const coherentOrder = stepOrders.every((order, index) => order === index + 1);
    const dependencyOrderValid = plan.steps.every((step) =>
      step.dependencies.every((dependency) => {
        const dependencyStep = plan.steps.find((candidate) => candidate.id === dependency);
        return Boolean(dependencyStep && dependencyStep.order < step.order);
      })
    );
    const coherence = [coherentOrder, dependencyOrderValid, plan.reasoningSummary.length > 0]
      .filter(Boolean).length / 3;
    if (!coherentOrder || !dependencyOrderValid) {
      issues.push({
        code: "plan_incoherent",
        message: "Plan contains out-of-order steps or dependency sequencing conflicts.",
        severity: "high",
      });
      suggestions.add("Keep dependency steps earlier than dependents and preserve contiguous ordering.");
    }

    const dependencyEntriesMatch = plan.dependencies.every((dependency) => {
      const step = plan.steps.find((candidate) => candidate.id === dependency.stepId);
      if (!step) {
        return false;
      }
      return step.dependencies.join("|") === dependency.dependsOn.join("|");
    });
    const dependencyCorrectness = dependencyEntriesMatch ? 1 : 0.5;
    if (!dependencyEntriesMatch) {
      issues.push({
        code: "dependency_mismatch",
        message: "Dependency declarations do not match step-level dependencies.",
        severity: "medium",
      });
      suggestions.add("Keep dependency summary entries synchronized with step dependencies.");
    }

    const riskySteps = plan.steps.filter((step) => step.risk !== "LOW");
    const planRiskAware =
      riskySteps.length === 0 ||
      plan.risks.length > 0 ||
      context.risks.length > 0;
    const riskAwareness = planRiskAware ? 1 : 0.4;
    if (!planRiskAware) {
      issues.push({
        code: "risk_awareness_low",
        message: "Plan includes elevated-risk steps without explicit risk tracking.",
        severity: "medium",
      });
      suggestions.add("Add explicit plan risks and mitigations for medium/high-risk steps.");
    }

    const score = clampScore(
      (completeness + coherence + dependencyCorrectness + riskAwareness) / 4
    );
    const planId = String(plan.metadata.planId ?? "");

    return {
      id: randomUUID(),
      type: "plan",
      createdAt: new Date().toISOString(),
      score,
      issues,
      suggestions: Array.from(suggestions),
      relatedPlanId: planId || undefined,
      dimensions: {
        completeness,
        coherence,
        dependencies: dependencyCorrectness,
        risk: riskAwareness,
      },
      metadata: {
        stepCount: plan.steps.length,
        goalCount: plan.goals.length,
        riskCount: plan.risks.length,
        issueCount: issues.length,
      },
    };
  }
}
