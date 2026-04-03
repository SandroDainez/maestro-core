import { z } from "zod";
import { SUPPORTED_PLANNER_PHASES } from "./phase-catalog";

const StepRiskSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
const StepTypeSchema = z.enum([
  "analysis",
  "generation",
  "modification",
  "validation",
]);
const PlannerPhaseSchema = z.enum(SUPPORTED_PLANNER_PHASES);

export const PlannerStepOutputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  phase: PlannerPhaseSchema,
  type: StepTypeSchema,
  order: z.number().int().positive(),
  agent: z.string().min(1),
  dependencies: z.array(z.string().min(1)),
  risk: StepRiskSchema,
  expectedOutput: z.string().min(1),
});

export const PlannerRiskOutputSchema = z.object({
  id: z.string().min(1),
  level: StepRiskSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  mitigation: z.string().min(1).optional(),
});

export const PlannerOutputSchema = z.object({
  goals: z.array(z.string().min(1)).min(1),
  steps: z.array(PlannerStepOutputSchema).min(1).max(15),
  agentsRequired: z.array(z.string().min(1)).default([]),
  dependencies: z.array(
    z.object({
      stepId: z.string().min(1),
      dependsOn: z.array(z.string().min(1)),
    })
  ),
  risks: z.array(PlannerRiskOutputSchema),
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string().min(1),
});

export type PlannerStepOutput = z.infer<typeof PlannerStepOutputSchema>;
export type PlannerRiskOutput = z.infer<typeof PlannerRiskOutputSchema>;
export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;
