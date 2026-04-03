import type {
  PlanDependency,
  PlanRisk,
  PlanStep,
} from "./types";
import {
  PlannerOutputSchema,
  type PlannerOutput,
} from "./planner-output.schema";

export class PlannerOutputTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerOutputTransportError";
  }
}

export class PlannerOutputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerOutputValidationError";
  }
}

export type NormalizedPlannerOutput = {
  goals: string[];
  steps: PlanStep[];
  agentsRequired: string[];
  dependencies: PlanDependency[];
  risks: PlanRisk[];
  confidence: number;
  reasoningSummary: string;
};

export function parsePlannerOutput(raw: string): NormalizedPlannerOutput {
  const parsedJson = parseTransport(raw);
  const validated = validateStructure(parsedJson);
  return normalizePlannerOutput(validated);
}

function parseTransport(raw: string): unknown {
  const trimmed = raw.trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new PlannerOutputTransportError(
      "Planner response must be a single JSON object."
    );
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch (error) {
    throw new PlannerOutputTransportError(
      `Planner response is not valid JSON: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`
    );
  }
}

function validateStructure(value: unknown): PlannerOutput {
  const result = PlannerOutputSchema.safeParse(value);

  if (!result.success) {
    throw new PlannerOutputValidationError(result.error.message);
  }

  const stepIds = new Set(result.data.steps.map((step) => step.id));
  if (stepIds.size !== result.data.steps.length) {
    throw new PlannerOutputValidationError("Planner steps must have unique ids.");
  }

  const orders = result.data.steps.map((step) => step.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    throw new PlannerOutputValidationError("Planner steps must have unique order values.");
  }

  const sortedOrders = [...orders].sort((a, b) => a - b);
  for (let index = 0; index < sortedOrders.length; index += 1) {
    if (sortedOrders[index] !== index + 1) {
      throw new PlannerOutputValidationError(
        "Planner steps must use contiguous ordering starting at 1."
      );
    }
  }

  if (countSentences(result.data.reasoningSummary) > 5) {
    throw new PlannerOutputValidationError(
      "Planner reasoningSummary must have at most 5 sentences."
    );
  }

  for (const step of result.data.steps) {
    for (const dependency of step.dependencies) {
      if (!stepIds.has(dependency)) {
        throw new PlannerOutputValidationError(
          `Step ${step.id} references unknown dependency ${dependency}.`
        );
      }
      if (dependency === step.id) {
        throw new PlannerOutputValidationError(
          `Step ${step.id} cannot depend on itself.`
        );
      }
    }
  }

  const dependencyMap = new Map<string, string[]>();
  for (const step of result.data.steps) {
    dependencyMap.set(step.id, step.dependencies);
  }

  for (const item of result.data.dependencies) {
    if (!stepIds.has(item.stepId)) {
      throw new PlannerOutputValidationError(
        `Dependency entry references unknown step ${item.stepId}.`
      );
    }
    for (const dependency of item.dependsOn) {
      if (!stepIds.has(dependency)) {
        throw new PlannerOutputValidationError(
          `Dependency entry for ${item.stepId} references unknown step ${dependency}.`
        );
      }
    }

    const fromStep = dependencyMap.get(item.stepId) ?? [];
    const fromEntry = [...item.dependsOn].sort();
    const fromStepSorted = [...fromStep].sort();
    if (JSON.stringify(fromEntry) !== JSON.stringify(fromStepSorted)) {
      throw new PlannerOutputValidationError(
        `Dependency entry for ${item.stepId} does not match step dependencies.`
      );
    }
  }

  detectCycles(dependencyMap);

  return result.data;
}

function normalizePlannerOutput(value: PlannerOutput): NormalizedPlannerOutput {
  const steps = [...value.steps].sort((a, b) => a.order - b.order);
  const derivedAgentsRequired = Array.from(
    new Set(steps.map((step) => step.agent.trim()).filter(Boolean))
  );
  const dependencies: PlanDependency[] = steps.map((step) => ({
    stepId: step.id,
    dependsOn: [...step.dependencies],
  }));

  return {
    goals: [...value.goals],
    steps: steps.map((step) => ({
      id: step.id,
      title: step.title,
      summary: step.summary,
      phase: step.phase,
      type: step.type,
      order: step.order,
      agent: step.agent,
      dependencies: [...step.dependencies],
      risk: step.risk,
      expectedOutput: step.expectedOutput,
    })),
    agentsRequired: derivedAgentsRequired,
    dependencies,
    risks: value.risks.map((risk) => ({
      id: risk.id,
      level: risk.level,
      title: risk.title,
      summary: risk.summary,
      ...(risk.mitigation ? { mitigation: risk.mitigation } : {}),
    })),
    confidence: value.confidence,
    reasoningSummary: value.reasoningSummary,
  };
}

function detectCycles(dependencyMap: Map<string, string[]>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (node: string) => {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      throw new PlannerOutputValidationError(
        `Planner dependencies must be acyclic. Cycle detected at ${node}.`
      );
    }

    visiting.add(node);
    const dependencies = dependencyMap.get(node) ?? [];
    for (const dependency of dependencies) {
      visit(dependency);
    }
    visiting.delete(node);
    visited.add(node);
  };

  for (const node of dependencyMap.keys()) {
    visit(node);
  }
}

function countSentences(input: string) {
  return input
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}
