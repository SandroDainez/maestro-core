import type {
  AutopilotRisk,
  AutopilotScanResult,
  MaestroProject,
} from "../../types";
import type { Plan, PlanStep, PlanStepType } from "../planning/types";
import type { AgentExecutionResult } from "../../agents/BaseAgent";

export type ExecutionStepStatus = "pending" | "running" | "completed" | "failed";

export type ExecutionFailureMode = "fail_fast" | "partial";

export type ReplanningReasonType =
  | "step_failure"
  | "dependency_chain_broken"
  | "output_quality_degraded"
  | "tool_failure_pattern"
  | "evaluation_score_drop";

export type ExecutionContext = {
  tenantId: string;
  project: Pick<MaestroProject, "id" | "name" | "rootPath" | "currentPhase">;
  objective: Plan["objective"];
  planConfidence: number;
  reasoningSummary: string;
  risks: AutopilotRisk[];
  dependencyResults: Record<string, AgentExecutionResult>;
  step: Pick<
    PlanStep,
    "id" | "title" | "summary" | "phase" | "risk" | "agent" | "type"
  >;
};

export type ExecutionStep = {
  id: string;
  agent: string;
  type: PlanStepType;
  input: {
    objective: string;
    title: string;
    summary: string;
    phase: string;
    risk: PlanStep["risk"];
  };
  expectedOutput: string;
  dependencies: string[];
  status: ExecutionStepStatus;
  result?: AgentExecutionResult;
  error?: {
    message: string;
    retryable: boolean;
  };
  startedAt?: string;
  finishedAt?: string;
  context: ExecutionContext;
};

export type ExecutionPlan = {
  sourcePlan: Plan;
  executableSteps: ExecutionStep[];
  executionOrder: string[];
  agentAssignments: Record<string, string[]>;
  metadata: {
    compiledAt: string;
    totalSteps: number;
    confidence: number;
  };
};

export type ExecutionReplanningReason = {
  type: ReplanningReasonType;
  message: string;
  evaluationScore?: number;
  stepId?: string;
  failedDependencyId?: string;
};

export type ExecutionReplanningContext = {
  tenantId: string;
  project: MaestroProject;
  scan: AutopilotScanResult;
  risks: AutopilotRisk[];
  maxReplans?: number;
  evaluationScoreThreshold?: number;
  outputQualityThreshold?: number;
  toolFailureRateThreshold?: number;
};
