import type { PlanningContext, Plan } from "../planning/types";
import type { ExecutionPlan, ExecutionStep } from "../execution/types";

export type EvaluationType = "plan" | "execution";

export type EvaluationIssue = {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
};

export type EvaluationDimension =
  | "coherence"
  | "completeness"
  | "risk"
  | "dependencies"
  | "success"
  | "output_quality"
  | "tool_usage"
  | "agent_performance";

export type EvaluationRecord = {
  id: string;
  type: EvaluationType;
  createdAt: string;
  score: number;
  issues: EvaluationIssue[];
  suggestions: string[];
  relatedPlanId?: string;
  relatedExecutionId?: string;
  dimensions: Partial<Record<EvaluationDimension, number>>;
  metadata: Record<string, string | number | boolean | null>;
};

export type PlanEvaluationInput = {
  plan: Plan;
  context: PlanningContext;
};

export type ExecutionEvaluationInput = {
  runId: string;
  executionPlan: ExecutionPlan;
  completedSteps: ExecutionStep[];
};

export interface PlanEvaluator {
  evaluate(input: PlanEvaluationInput): EvaluationRecord;
}

export interface ExecutionEvaluator {
  evaluate(input: ExecutionEvaluationInput): EvaluationRecord;
}
