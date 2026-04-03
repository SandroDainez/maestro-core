import { randomUUID } from "crypto";

import type { PlannerModelPort } from "./ports/PlannerModelPort";
import type {
  MemoryRetrievalPort,
  MemoryRetrievalQuery,
} from "./ports/MemoryRetrievalPort";
import type { PlanPersistencePort } from "./ports/PlanPersistencePort";
import type {
  Objective,
  Plan,
  PlanningContext,
  PlanningMemoryContext,
} from "./types";
import type { MemoryIndexer } from "../memory/types";
import type { EvaluationRecord, PlanEvaluator } from "../evaluation/types";
import { EvaluationFeedbackService } from "../evaluation/EvaluationFeedbackService";
import type {
  AutopilotRisk,
  AutopilotScanResult,
  MaestroProject,
} from "../../types";

export type CreatePlanInput = {
  tenantId: string;
  project: MaestroProject;
  objective: Objective;
  scan: AutopilotScanResult;
  risks: AutopilotRisk[];
};

export type CreatePlanResult = {
  plan: Plan;
  context: PlanningContext;
};

type PlanningServiceOptions = {
  candidateCount?: number;
};

type CandidatePlanScore = {
  candidateId: string;
  plan: Plan;
  evaluation?: EvaluationRecord;
  planScore: number;
  historicalSuccessScore: number;
  failureAvoidanceScore: number;
  combinedScore: number;
};

export class PlanningService {
  private readonly candidateCount: number;

  constructor(
    private readonly plannerModel: PlannerModelPort,
    private readonly memoryRetrieval: MemoryRetrievalPort,
    private readonly planPersistence?: PlanPersistencePort,
    private readonly memoryIndexer?: MemoryIndexer,
    private readonly planEvaluator?: PlanEvaluator,
    options: PlanningServiceOptions = {}
  ) {
    this.candidateCount = Math.max(1, Math.min(3, options.candidateCount ?? 3));
  }

  async createPlan(input: CreatePlanInput): Promise<CreatePlanResult> {
    const memoryQuery: MemoryRetrievalQuery = {
      tenantId: input.tenantId,
      projectId: input.project.id,
      projectPath: input.project.rootPath,
      objective: input.objective,
      successScoreThreshold: 0.75,
      failureScoreThreshold: 0.45,
    };
    const memory = await this.memoryRetrieval.retrieve(memoryQuery);
    const context: PlanningContext = {
      tenantId: input.tenantId,
      project: input.project,
      objective: input.objective,
      scan: input.scan,
      risks: input.risks,
      memory: this.normalizeMemory(memory),
    };
    const candidates = await this.generateCandidatePlans(context);
    const selected = this.selectBestCandidate(candidates, context);
    const plan = {
      ...selected.plan,
      metadata: {
        ...selected.plan.metadata,
        planScore: selected.evaluation?.score ?? selected.planScore,
        selectionScore: selected.combinedScore,
        candidateCount: candidates.length,
        selectedCandidateId: selected.candidateId,
      },
    };
    const evaluation = selected.evaluation;
    const planId =
      plan.metadata && "planId" in plan.metadata
        ? String(plan.metadata.planId ?? "")
        : "";

    this.log("planning_candidates_generated", {
      candidateCount: candidates.length,
      selectedCandidateId: selected.candidateId,
      candidates: candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        planId: candidate.plan.metadata.planId,
        planScore: candidate.planScore,
        historicalSuccessScore: candidate.historicalSuccessScore,
        failureAvoidanceScore: candidate.failureAvoidanceScore,
        combinedScore: candidate.combinedScore,
      })),
    });

    if (this.memoryIndexer) {
      const feedback = evaluation
        ? new EvaluationFeedbackService(this.memoryIndexer)
        : undefined;
      const evaluationMetadata = evaluation
        ? await feedback?.recordPlanEvaluation({
            tenantId: input.tenantId,
            projectId: input.project.id,
            plan,
            evaluation,
          })
        : undefined;

      await this.memoryIndexer.storeMemory(
        {
          scope: "project",
          category: "plan",
          content: this.describePlan(plan),
          metadata: {
            planId,
            objective: input.objective.raw,
            confidence: plan.confidence,
            stepCount: plan.steps.length,
            score: evaluation?.score ?? null,
            evaluationId: evaluationMetadata?.evaluationId ?? null,
            outcome:
              (evaluation?.score ?? 0) >= 0.8 ? "successful" : "needs_review",
          },
        },
        {
          tenantId: input.tenantId,
          projectId: input.project.id,
        }
      );

    }

    if (this.planPersistence) {
      await this.planPersistence.save({
        tenantId: input.tenantId,
        projectId: input.project.id,
        objective: input.objective,
        plan,
        scan: input.scan,
        risks: input.risks,
      });
    }

    return { plan, context };
  }

  private describePlan(plan: Plan) {
    return [
      `Objective: ${plan.objective.raw}`,
      `Goals: ${plan.goals.join("; ")}`,
      `Reasoning: ${plan.reasoningSummary}`,
      `Steps: ${plan.steps
        .map(
          (step) =>
            `${step.order}. ${step.title} [${step.agent}/${step.type}] -> ${step.expectedOutput}`
        )
        .join(" | ")}`,
      `Risks: ${plan.risks.map((risk) => `${risk.level}:${risk.title}`).join(" | ") || "none"}`,
    ].join("\n");
  }
  private normalizeMemory(memory: PlanningMemoryContext): PlanningMemoryContext {
    return {
      records: memory.records,
      recentProjects: memory.recentProjects,
      preferences: memory.preferences,
      recentDecisions: memory.recentDecisions,
      feedback: memory.feedback,
    };
  }

  private async generateCandidatePlans(context: PlanningContext) {
    const candidates: CandidatePlanScore[] = [];

    for (let index = 0; index < this.candidateCount; index += 1) {
      const rawPlan = await this.plannerModel.generatePlan(context, {
        candidateIndex: index,
        totalCandidates: this.candidateCount,
      });
      const planId = String(rawPlan.metadata.planId ?? randomUUID());
      const plan: Plan = {
        ...rawPlan,
        metadata: {
          ...rawPlan.metadata,
          planId,
          candidateIndex: index,
          totalCandidates: this.candidateCount,
        },
      };
      const evaluation = this.planEvaluator?.evaluate({ plan, context });
      const planScore = evaluation?.score ?? 0.5;
      const historicalSuccessScore = this.computeHistoricalSuccessScore(plan, context);
      const failureAvoidanceScore = this.computeFailureAvoidanceScore(plan, context);
      const combinedScore = Number(
        (
          planScore * 0.6 +
          historicalSuccessScore * 0.25 +
          failureAvoidanceScore * 0.15
        ).toFixed(6)
      );

      candidates.push({
        candidateId: `candidate-${index + 1}`,
        plan,
        evaluation,
        planScore,
        historicalSuccessScore,
        failureAvoidanceScore,
        combinedScore,
      });
    }

    return candidates;
  }

  private selectBestCandidate(
    candidates: CandidatePlanScore[],
    context: PlanningContext
  ) {
    const sorted = [...candidates].sort((left, right) => {
      if (right.combinedScore !== left.combinedScore) {
        return right.combinedScore - left.combinedScore;
      }
      return right.planScore - left.planScore;
    });
    const selected = sorted[0];

    this.log("planning_selection_decision", {
      objective: context.objective.raw,
      selectedCandidateId: selected.candidateId,
      selectedPlanId: selected.plan.metadata.planId,
      combinedScore: selected.combinedScore,
      planScore: selected.planScore,
    });

    return selected;
  }

  private computeHistoricalSuccessScore(plan: Plan, context: PlanningContext) {
    const feedback = context.memory.feedback.successPatterns;
    if (feedback.length === 0) {
      return 0.5;
    }

    const planText = [
      ...plan.goals,
      ...plan.steps.map((step) => `${step.agent} ${step.phase} ${step.expectedOutput}`),
    ]
      .join(" ")
      .toLowerCase();

    let totalWeight = 0;
    let matchedWeight = 0;

    for (const pattern of feedback) {
      totalWeight += pattern.score;
      const normalized = pattern.summary.toLowerCase();
      if (
        normalized.split(/\s+/).some((token) => token.length > 3 && planText.includes(token))
      ) {
        matchedWeight += pattern.score;
      }
    }

    if (totalWeight === 0) {
      return 0.5;
    }

    return Number((matchedWeight / totalWeight).toFixed(6));
  }

  private computeFailureAvoidanceScore(plan: Plan, context: PlanningContext) {
    const feedback = context.memory.feedback.failurePatterns;
    if (feedback.length === 0) {
      return 1;
    }

    const planText = [
      ...plan.goals,
      ...plan.steps.map((step) => `${step.agent} ${step.phase} ${step.summary}`),
    ]
      .join(" ")
      .toLowerCase();

    let totalPenaltyWeight = 0;

    for (const pattern of feedback) {
      const normalized = pattern.summary.toLowerCase();
      const overlaps = normalized
        .split(/\s+/)
        .filter((token) => token.length > 3 && planText.includes(token)).length;
      if (overlaps > 0) {
        totalPenaltyWeight += pattern.score;
      }
    }

    const boundedPenalty = Math.max(0, Math.min(1, totalPenaltyWeight));
    return Number((1 - boundedPenalty).toFixed(6));
  }

  private log(event: string, payload: Record<string, unknown>) {
    console.info(
      JSON.stringify({
        scope: "maestro.planning",
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      })
    );
  }
}
