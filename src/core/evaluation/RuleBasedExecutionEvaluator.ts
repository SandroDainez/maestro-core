import { randomUUID } from "crypto";

import type {
  EvaluationIssue,
  EvaluationRecord,
  ExecutionEvaluationInput,
  ExecutionEvaluator,
} from "./types";

function clampScore(score: number) {
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

export class RuleBasedExecutionEvaluator implements ExecutionEvaluator {
  evaluate(input: ExecutionEvaluationInput): EvaluationRecord {
    const { runId, executionPlan, completedSteps } = input;
    const issues: EvaluationIssue[] = [];
    const suggestions = new Set<string>();
    const totalSteps = completedSteps.length;
    const completed = completedSteps.filter((step) => step.status === "completed");
    const failed = completedSteps.filter((step) => step.status === "failed");

    const successRate = totalSteps === 0 ? 0 : completed.length / totalSteps;
    if (failed.length > 0) {
      issues.push({
        code: "execution_failures",
        message: `${failed.length} execution steps failed.`,
        severity: failed.length === totalSteps ? "high" : "medium",
      });
      suggestions.add("Inspect failed steps and strengthen preconditions or retries.");
    }

    const correctnessChecks = completedSteps.map((step) => {
      if (step.status === "completed") {
        return Boolean(step.result && Object.keys(step.result.result).length > 0);
      }
      return Boolean(step.error);
    });
    const stepCorrectness =
      correctnessChecks.length === 0
        ? 0
        : correctnessChecks.filter(Boolean).length / correctnessChecks.length;

    const traces = completed.flatMap((step) => step.result?.toolUsageTrace ?? []);
    const successfulTraces = traces.filter((trace) => trace.status === "success");
    const toolEffectiveness =
      traces.length === 0 ? 1 : successfulTraces.length / traces.length;
    if (toolEffectiveness < 1) {
      issues.push({
        code: "tool_failures",
        message: "Some tool invocations failed during execution.",
        severity: "medium",
      });
      suggestions.add("Review tool contracts and error handling for unstable calls.");
    }

    const outputQualityChecks = completed.map((step) => {
      const result = step.result?.result ?? {};
      return Object.values(result).some((value) => value !== null && value !== "");
    });
    const outputQuality =
      outputQualityChecks.length === 0
        ? 0
        : outputQualityChecks.filter(Boolean).length / outputQualityChecks.length;

    const score = clampScore(
      (successRate + stepCorrectness + toolEffectiveness + outputQuality) / 4
    );
    const relatedPlanId = String(executionPlan.sourcePlan.metadata?.planId ?? "");

    return {
      id: randomUUID(),
      type: "execution",
      createdAt: new Date().toISOString(),
      score,
      issues,
      suggestions: Array.from(suggestions),
      relatedPlanId: relatedPlanId || undefined,
      relatedExecutionId: runId,
      dimensions: {
        success: successRate,
        output_quality: outputQuality,
        tool_usage: toolEffectiveness,
        agent_performance: stepCorrectness,
      },
      metadata: {
        totalSteps,
        completedSteps: completed.length,
        failedSteps: failed.length,
        toolCalls: traces.length,
        toolSuccessRate: Number(toolEffectiveness.toFixed(3)),
      },
    };
  }
}
