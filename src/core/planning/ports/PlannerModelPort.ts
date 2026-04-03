import type { Plan, PlanningContext } from "../types";

export type GeneratePlanOptions = {
  candidateIndex?: number;
  totalCandidates?: number;
};

export interface PlannerModelPort {
  generatePlan(
    context: PlanningContext,
    options?: GeneratePlanOptions
  ): Promise<Plan>;
}
