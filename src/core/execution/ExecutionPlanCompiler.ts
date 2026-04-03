import { AgentRegistry } from "../../agents/AgentRegistry";
import { ArchitectureAgent } from "../../agents/ArchitectureAgent";
import { DeveloperAgent } from "../../agents/DeveloperAgent";
import { FallbackAgent } from "../../agents/FallbackAgent";
import { GovernanceAgent } from "../../agents/GovernanceAgent";
import { ReviewerAgent } from "../../agents/ReviewerAgent";
import type { AutopilotRisk } from "../../types";
import type { Plan } from "../planning/types";
import type { ExecutionContext, ExecutionPlan, ExecutionStep } from "./types";

export class ExecutionPlanCompilerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionPlanCompilerError";
  }
}

export type CompileExecutionPlanInput = {
  tenantId: string;
  plan: Plan;
  risks: AutopilotRisk[];
};

export class ExecutionPlanCompiler {
  private readonly agents = new AgentRegistry();

  constructor() {
    this.agents.register(new ArchitectureAgent());
    this.agents.register(new DeveloperAgent());
    this.agents.register(new GovernanceAgent());
    this.agents.register(new ReviewerAgent());
    this.agents.register(new FallbackAgent());
  }

  compile(input: CompileExecutionPlanInput): ExecutionPlan {
    this.validateAgents(input.plan);
    const executionOrder = this.resolveExecutionOrder(input.plan);
    const stepById = new Map(input.plan.steps.map((step) => [step.id, step]));

    const executableSteps = executionOrder.map((stepId) => {
      const step = stepById.get(stepId);
      if (!step) {
        throw new ExecutionPlanCompilerError(
          `Execution order references unknown step ${stepId}.`
        );
      }

      const context: ExecutionContext = {
        tenantId: input.tenantId,
        project: input.plan.project,
        objective: input.plan.objective,
        planConfidence: input.plan.confidence,
        reasoningSummary: input.plan.reasoningSummary,
        risks: input.risks,
        dependencyResults: {},
        step: {
          id: step.id,
          title: step.title,
          summary: step.summary,
          phase: step.phase,
          risk: step.risk,
          agent: step.agent,
          type: step.type,
        },
      };

      const executableStep: ExecutionStep = {
        id: step.id,
        agent: step.agent,
        type: step.type,
        input: {
          objective: input.plan.objective.raw,
          title: step.title,
          summary: step.summary,
          phase: step.phase,
          risk: step.risk,
        },
        expectedOutput: step.expectedOutput,
        dependencies: [...step.dependencies],
        status: "pending",
        result: undefined,
        error: undefined,
        startedAt: undefined,
        finishedAt: undefined,
        context,
      };

      return executableStep;
    });

    const agentAssignments = executableSteps.reduce<Record<string, string[]>>(
      (acc, step) => {
        acc[step.agent] = [...(acc[step.agent] ?? []), step.id];
        return acc;
      },
      {}
    );

    return {
      sourcePlan: input.plan,
      executableSteps,
      executionOrder,
      agentAssignments,
      metadata: {
        compiledAt: new Date().toISOString(),
        totalSteps: executableSteps.length,
        confidence: input.plan.confidence,
      },
    };
  }

  private validateAgents(plan: Plan) {
    for (const step of plan.steps) {
      if (!this.agents.findByName(step.agent)) {
        throw new ExecutionPlanCompilerError(
          `Unknown agent "${step.agent}" for step ${step.id}.`
        );
      }
    }
  }

  private resolveExecutionOrder(plan: Plan) {
    const indegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const stepOrder = new Map(plan.steps.map((step) => [step.id, step.order]));

    for (const step of plan.steps) {
      indegree.set(step.id, step.dependencies.length);
      adjacency.set(step.id, []);
    }

    for (const step of plan.steps) {
      for (const dependency of step.dependencies) {
        if (!indegree.has(dependency)) {
          throw new ExecutionPlanCompilerError(
            `Step ${step.id} depends on unknown step ${dependency}.`
          );
        }
        adjacency.set(dependency, [...(adjacency.get(dependency) ?? []), step.id]);
      }
    }

    const queue = plan.steps
      .filter((step) => (indegree.get(step.id) ?? 0) === 0)
      .sort((a, b) => a.order - b.order)
      .map((step) => step.id);

    const ordered: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      ordered.push(current);

      const dependents = adjacency.get(current) ?? [];
      for (const dependent of dependents) {
        const next = (indegree.get(dependent) ?? 0) - 1;
        indegree.set(dependent, next);
        if (next === 0) {
          queue.push(dependent);
          queue.sort(
            (left, right) =>
              (stepOrder.get(left) ?? 0) - (stepOrder.get(right) ?? 0)
          );
        }
      }
    }

    if (ordered.length !== plan.steps.length) {
      throw new ExecutionPlanCompilerError(
        "Execution plan contains an invalid dependency graph."
      );
    }

    return ordered;
  }
}
