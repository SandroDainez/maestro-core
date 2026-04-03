import type { ExecutionPlan, ExecutionStep } from "../execution/types";
import type { Plan } from "../planning/types";
import type { MemoryIndexer, MemoryMetadata } from "../memory/types";
import type { EvaluationRecord } from "./types";

type FeedbackContext = {
  tenantId: string;
  projectId: string;
};

type PlanFeedbackInput = FeedbackContext & {
  plan: Plan;
  evaluation: EvaluationRecord;
};

type ExecutionFeedbackInput = FeedbackContext & {
  runId: string;
  executionPlan: ExecutionPlan;
  completedSteps: ExecutionStep[];
  evaluation: EvaluationRecord;
};

export class EvaluationFeedbackService {
  constructor(private readonly memoryIndexer: MemoryIndexer) {}

  async recordPlanEvaluation(input: PlanFeedbackInput) {
    const planId = String(input.plan.metadata.planId ?? input.evaluation.relatedPlanId ?? "");
    const metadata: MemoryMetadata = {
      evaluationId: input.evaluation.id,
      evaluationType: input.evaluation.type,
      relatedPlanId: planId || null,
      relatedExecutionId: null,
      score: input.evaluation.score,
      issueCount: input.evaluation.issues.length,
      sourceCategory: "plan",
      createdAt: input.evaluation.createdAt,
    };

    await this.memoryIndexer.storeMemory(
      {
        id: `evaluation:${input.evaluation.id}`,
        scope: "project",
        category: "evaluation",
        content: this.describeEvaluation(input.evaluation),
        metadata,
      },
      {
        tenantId: input.tenantId,
        projectId: input.projectId,
      }
    );

    return metadata;
  }

  async recordExecutionFeedback(input: ExecutionFeedbackInput) {
    const planId = String(
      input.executionPlan.sourcePlan.metadata?.planId ?? input.evaluation.relatedPlanId ?? ""
    );
    const failedSteps = input.completedSteps.filter((step) => step.status === "failed");
    const completedCount = input.completedSteps.filter(
      (step) => step.status === "completed"
    ).length;
    const executionMetadata: MemoryMetadata = {
      runId: input.runId,
      relatedPlanId: planId || null,
      evaluationId: input.evaluation.id,
      sourceCategory: "execution",
      completedSteps: completedCount,
      failedSteps: failedSteps.length,
      outcome: failedSteps.length > 0 ? "partial_or_failed" : "successful",
    };

    await this.memoryIndexer.storeMemory(
      {
        id: `execution-summary:${input.runId}`,
        scope: "project",
        category: "execution",
        content: this.describeExecution(input.runId, input.completedSteps, input.evaluation),
        metadata: executionMetadata,
      },
      {
        tenantId: input.tenantId,
        projectId: input.projectId,
      }
    );

    await this.memoryIndexer.storeMemory(
      {
        id: `evaluation:${input.evaluation.id}`,
        scope: "project",
        category: "evaluation",
        content: this.describeEvaluation(input.evaluation),
        metadata: {
          evaluationId: input.evaluation.id,
          evaluationType: input.evaluation.type,
          relatedPlanId: planId || null,
          relatedExecutionId: input.runId,
          score: input.evaluation.score,
          issueCount: input.evaluation.issues.length,
          sourceCategory: "execution",
          createdAt: input.evaluation.createdAt,
        },
      },
      {
        tenantId: input.tenantId,
        projectId: input.projectId,
      }
    );

    return executionMetadata;
  }

  private describeEvaluation(evaluation: EvaluationRecord) {
    return [
      `Evaluation id: ${evaluation.id}`,
      `Type: ${evaluation.type}`,
      `Score: ${evaluation.score}`,
      `Plan link: ${evaluation.relatedPlanId ?? "none"}`,
      `Execution link: ${evaluation.relatedExecutionId ?? "none"}`,
      `Issues: ${
        evaluation.issues.map((issue) => `${issue.code}:${issue.message}`).join(" | ") || "none"
      }`,
      `Suggestions: ${evaluation.suggestions.join(" | ") || "none"}`,
    ].join("\n");
  }

  private describeExecution(
    runId: string,
    completedSteps: ExecutionStep[],
    evaluation: EvaluationRecord
  ) {
    return [
      `Execution run: ${runId}`,
      `Status summary: ${completedSteps.map((step) => `${step.id}:${step.status}`).join(" | ")}`,
      `Evaluation score: ${evaluation.score}`,
      `Evaluation id: ${evaluation.id}`,
    ].join("\n");
  }
}
