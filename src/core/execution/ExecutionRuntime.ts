import type { Prisma } from "@prisma/client";

import { AgentRegistry } from "../../agents/AgentRegistry";
import { ArchitectureAgent } from "../../agents/ArchitectureAgent";
import { DeveloperAgent } from "../../agents/DeveloperAgent";
import { FallbackAgent } from "../../agents/FallbackAgent";
import { GovernanceAgent } from "../../agents/GovernanceAgent";
import { ReviewerAgent } from "../../agents/ReviewerAgent";
import type { AgentExecutionResult } from "../../agents/BaseAgent";
import type { PhaseExecutionDirective } from "../../types";
import { PhaseRunRepository } from "../../db/phase-run.repository";
import type { ExecutionFailureMode, ExecutionPlan, ExecutionStep } from "./types";
import { createDefaultToolRegistry } from "../../tools/default-tool-registry";
import type { ToolRegistry } from "../../tools/ToolRegistry";
import type { MemoryIndexer } from "../memory/types";
import type { ExecutionEvaluator } from "../evaluation/types";
import { RuleBasedExecutionEvaluator } from "../evaluation/RuleBasedExecutionEvaluator";
import { EvaluationFeedbackService } from "../evaluation/EvaluationFeedbackService";
import type { PlanningService } from "../planning/PlanningService";
import { ExecutionPlanCompiler } from "./ExecutionPlanCompiler";
import type {
  ExecutionReplanningContext,
  ExecutionReplanningReason,
} from "./types";

export class ExecutionRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionRuntimeError";
  }
}

export type ExecutionRuntimeOptions = {
  parallelism?: number;
  retryLimit?: number;
  failureMode?: ExecutionFailureMode;
  maxSteps?: number;
  allowedPhases?: string[];
  maxRuntimeMs?: number;
  maxToolCallsPerStep?: number;
  allowDestructiveCommands?: boolean;
  protectedPaths?: string[];
  writableRoots?: string[];
  control?: {
    shouldPause?: () => boolean;
    shouldAbort?: () => boolean;
    manualOverride?: Record<string, unknown>;
  };
};

export type ExecutionRuntimeDependencies = {
  toolRegistry?: ToolRegistry;
  agentRegistry?: AgentRegistry;
  memoryIndexer?: MemoryIndexer;
  executionEvaluator?: ExecutionEvaluator;
  planningService?: PlanningService;
  executionPlanCompiler?: ExecutionPlanCompiler;
  rollbackStrategy?: {
    rollback(input: {
      runId: string;
      projectRoot: string;
      reason: string;
    }): Promise<void>;
  };
};

export class ExecutionRuntime {
  private readonly agents: AgentRegistry;
  private readonly tools: ToolRegistry;
  private readonly memoryIndexer?: MemoryIndexer;
  private readonly executionEvaluator?: ExecutionEvaluator;
  private readonly planningService?: PlanningService;
  private readonly executionPlanCompiler: ExecutionPlanCompiler;
  private readonly rollbackStrategy?: ExecutionRuntimeDependencies["rollbackStrategy"];

  constructor(
    private readonly phaseRunRepo: PhaseRunRepository,
    dependencies?: ExecutionRuntimeDependencies
  ) {
    this.tools = dependencies?.toolRegistry ?? createDefaultToolRegistry();
    this.agents = dependencies?.agentRegistry ?? new AgentRegistry();
    this.memoryIndexer = dependencies?.memoryIndexer;
    this.executionEvaluator =
      dependencies?.executionEvaluator ?? new RuleBasedExecutionEvaluator();
    this.planningService = dependencies?.planningService;
    this.executionPlanCompiler =
      dependencies?.executionPlanCompiler ?? new ExecutionPlanCompiler();
    this.rollbackStrategy = dependencies?.rollbackStrategy;

    if (this.agents.listNames().length === 0) {
      this.agents.register(new ArchitectureAgent(this.tools));
      this.agents.register(new DeveloperAgent(this.tools));
      this.agents.register(new GovernanceAgent(this.tools));
      this.agents.register(new ReviewerAgent(this.tools));
      this.agents.register(new FallbackAgent());
    }
  }

  async execute(input: {
    runId: string;
    executionPlan: ExecutionPlan;
    phaseDirectives?: PhaseExecutionDirective[];
    options?: ExecutionRuntimeOptions;
    replanning?: ExecutionReplanningContext;
  }) {
    const parallelism = Math.max(1, input.options?.parallelism ?? 4);
    const retryLimit = Math.max(0, input.options?.retryLimit ?? 0);
    const failureMode = input.options?.failureMode ?? "fail_fast";
    const maxSteps = Math.max(1, input.options?.maxSteps ?? input.executionPlan.executableSteps.length);
    const allowedPhases = input.options?.allowedPhases ?? [];
    const startedAtMs = Date.now();
    const phaseSummaries: Array<Record<string, unknown>> = [];
    const traceEvents: Array<Record<string, unknown>> = [];
    let activeExecutionPlan = input.executionPlan;
    let steps = activeExecutionPlan.executableSteps;
    let stepMap = new Map(steps.map((step) => [step.id, step]));
    const completedResults = new Map<string, AgentExecutionResult>();
    let replanCount = 0;
    const maxReplans = Math.max(0, input.replanning?.maxReplans ?? 2);
    const replanEvents: Array<Record<string, unknown>> = [];

    while (true) {
      if (input.options?.control?.shouldAbort?.()) {
        await this.abortExecution(input, "manual_abort_requested");
        break;
      }
      if (input.options?.control?.shouldPause?.()) {
        this.log("execution_paused", {
          runId: input.runId,
        });
        break;
      }
      if (
        typeof input.options?.maxRuntimeMs === "number" &&
        Date.now() - startedAtMs > input.options.maxRuntimeMs
      ) {
        await this.abortExecution(input, "max_runtime_exceeded");
        break;
      }

      this.markBlockedDependents(steps, stepMap, failureMode);

      const readySteps = steps
        .filter((step) => step.status === "pending")
        .filter((step) =>
          allowedPhases.length > 0 ? allowedPhases.includes(step.input.phase) : true
        )
        .filter((step) =>
          step.dependencies.every(
            (dependency) => stepMap.get(dependency)?.status === "completed"
          )
        )
        .slice(0, parallelism);

      if (readySteps.length === 0) {
        const hasRunning = steps.some((step) => step.status === "running");
        const hasPending = steps.some((step) => step.status === "pending");

        if (hasRunning) {
          throw new ExecutionRuntimeError(
            "Execution runtime reached an invalid state with running steps outside scheduler control."
          );
        }

        if (!hasPending) {
          break;
        }

        if (allowedPhases.length > 0) {
          break;
        }

        throw new ExecutionRuntimeError(
          "Execution runtime detected pending steps with unmet dependencies."
        );
      }

      const batchResults = await Promise.all(
        readySteps.map((step) =>
          this.executeStep({
            runId: input.runId,
            planId: String(activeExecutionPlan.sourcePlan.metadata?.planId ?? ""),
            step,
            retryLimit,
            completedResults,
            directive: input.phaseDirectives?.find(
              (item) => item.phase === step.input.phase
            ),
          })
        )
      );

      for (const result of batchResults) {
        phaseSummaries.push(result.operationalSummary);
        traceEvents.push({
          kind: "step",
          stepId: result.step.id,
          phase: result.step.input.phase,
          agent: result.step.agent,
          status: result.step.status,
          startedAt: result.step.startedAt ?? null,
          finishedAt: result.step.finishedAt ?? null,
          dependencies: result.step.dependencies,
          toolUsageTrace: result.step.result?.toolUsageTrace ?? [],
          logs: result.step.result?.logs ?? [],
          error: result.step.error?.message ?? null,
        });
        if (result.step.result) {
          completedResults.set(result.step.id, result.step.result);
        }
      }

      const trigger = this.detectReplanningTrigger({
        runId: input.runId,
        executionPlan: activeExecutionPlan,
        steps,
        batchResults,
        evaluationScoreThreshold: input.replanning?.evaluationScoreThreshold ?? 0.55,
        outputQualityThreshold: input.replanning?.outputQualityThreshold ?? 0.45,
        toolFailureRateThreshold: input.replanning?.toolFailureRateThreshold ?? 0.4,
      });

      if (trigger) {
        if (input.replanning && this.planningService && replanCount < maxReplans) {
          replanCount += 1;
          this.log("execution_replanning_triggered", {
            runId: input.runId,
            replanCount,
            maxReplans,
            reasonType: trigger.type,
            reason: trigger.message,
            activePlanId: activeExecutionPlan.sourcePlan.metadata?.planId ?? null,
          });

          const replanned = await this.replanExecution({
            runId: input.runId,
            executionPlan: activeExecutionPlan,
            replanning: input.replanning,
            completedResults,
            reason: trigger,
            replanCount,
          });
          activeExecutionPlan = replanned.executionPlan;
          steps = activeExecutionPlan.executableSteps;
          stepMap = new Map(steps.map((step) => [step.id, step]));
          replanEvents.push({
            replanCount,
            reasonType: trigger.type,
            reason: trigger.message,
            newPlanId: activeExecutionPlan.sourcePlan.metadata?.planId ?? null,
            planVersion: activeExecutionPlan.sourcePlan.metadata?.planVersion ?? null,
          });
          traceEvents.push({
            kind: "replan",
            replanCount,
            reasonType: trigger.type,
            reason: trigger.message,
            newPlanId: activeExecutionPlan.sourcePlan.metadata?.planId ?? null,
            newPlanVersion: activeExecutionPlan.sourcePlan.metadata?.planVersion ?? null,
          });
          continue;
        }

        this.log("execution_replanning_skipped", {
          runId: input.runId,
          reasonType: trigger.type,
          reason: trigger.message,
          replanCount,
          maxReplans,
        });
      }

      const failedInBatch = batchResults.filter(
        (result) => result.step.status === "failed"
      );
      if (failureMode === "fail_fast" && failedInBatch.length > 0) {
        throw new ExecutionRuntimeError(
          `Execution stopped after step failure: ${failedInBatch[0].step.id}`
        );
      }

      if (completedResults.size >= maxSteps) {
        this.log("execution_scope_limit_reached", {
          runId: input.runId,
          maxSteps,
        });
        break;
      }
    }

    const evaluation = this.executionEvaluator?.evaluate({
      runId: input.runId,
      executionPlan: activeExecutionPlan,
      completedSteps: steps,
    });

    if (evaluation && this.memoryIndexer) {
      const projectId = steps[0]?.context.project.id;
      const tenantId = steps[0]?.context.tenantId;

      if (projectId && tenantId) {
        const feedback = new EvaluationFeedbackService(this.memoryIndexer);
        const executionMetadata = await feedback.recordExecutionFeedback({
          tenantId,
          projectId,
          runId: input.runId,
          executionPlan: activeExecutionPlan,
          completedSteps: steps,
          evaluation,
        });

        for (const performanceRecord of this.buildPerformanceRecords(steps)) {
          await this.memoryIndexer.storeMemory(
            {
              scope: "project",
              category: "performance",
              content: performanceRecord.content,
              metadata: {
                ...performanceRecord.metadata,
                runId: input.runId,
                relatedPlanId: evaluation.relatedPlanId ?? null,
                evaluationId: executionMetadata.evaluationId ?? null,
              },
            },
            {
              tenantId,
              projectId,
            }
          );
        }
      }
    }

    const metrics = this.buildExecutionMetrics(steps, evaluation);

    return {
      phaseSummaries,
      graph: {
        totalSteps: steps.length,
        completedSteps: steps.filter((step) => step.status === "completed").length,
        failedSteps: steps.filter((step) => step.status === "failed").length,
      },
      evaluation,
      metrics,
      trace: {
        runId: input.runId,
        planId: activeExecutionPlan.sourcePlan.metadata?.planId ?? null,
        planVersion: activeExecutionPlan.sourcePlan.metadata?.planVersion ?? 1,
        nodes: steps.map((step) => ({
          id: step.id,
          phase: step.input.phase,
          agent: step.agent,
          status: step.status,
          dependencies: step.dependencies,
        })),
        edges: steps.flatMap((step) =>
          step.dependencies.map((dependency) => ({
            from: dependency,
            to: step.id,
          }))
        ),
        events: traceEvents,
        decisionPath: [
          {
            type: "plan_selected",
            planId: activeExecutionPlan.sourcePlan.metadata?.planId ?? null,
            planVersion: activeExecutionPlan.sourcePlan.metadata?.planVersion ?? 1,
            confidence: activeExecutionPlan.metadata.confidence,
          },
          ...replanEvents.map((event) => ({
            type: "replan_applied",
            ...event,
          })),
        ],
      },
      control: {
        replanningEnabled: Boolean(input.replanning && this.planningService),
        maxReplans,
        evaluationScoreThreshold: input.replanning?.evaluationScoreThreshold ?? 0.55,
        outputQualityThreshold: input.replanning?.outputQualityThreshold ?? 0.45,
        toolFailureRateThreshold: input.replanning?.toolFailureRateThreshold ?? 0.4,
        maxSteps,
        allowedPhases,
      },
      replanning: {
        count: replanCount,
        events: replanEvents,
        finalPlanId: activeExecutionPlan.sourcePlan.metadata?.planId ?? null,
        finalPlanVersion: activeExecutionPlan.sourcePlan.metadata?.planVersion ?? null,
      },
    };
  }

  private detectReplanningTrigger(input: {
    runId: string;
    executionPlan: ExecutionPlan;
    steps: ExecutionStep[];
    batchResults: Array<{ step: ExecutionStep; operationalSummary: Record<string, unknown> }>;
    evaluationScoreThreshold: number;
    outputQualityThreshold: number;
    toolFailureRateThreshold: number;
  }): ExecutionReplanningReason | null {
    const failedStep = input.batchResults.find((result) => result.step.status === "failed")?.step;
    if (failedStep) {
      return {
        type: "step_failure",
        message: `Step ${failedStep.id} failed: ${failedStep.error?.message ?? "unknown error"}`,
        stepId: failedStep.id,
      };
    }

    const dependencyBroken = input.steps.find(
      (step) =>
        step.status === "failed" &&
        step.error?.message?.includes("Dependency ")
    );
    if (dependencyBroken) {
      return {
        type: "dependency_chain_broken",
        message: dependencyBroken.error?.message ?? "Dependency chain broken.",
        stepId: dependencyBroken.id,
      };
    }

    const completedInBatch = input.batchResults
      .map((result) => result.step)
      .filter((step) => step.status === "completed");
    if (completedInBatch.length > 0) {
      const outputQuality = this.computeOutputQuality(completedInBatch);
      if (outputQuality < input.outputQualityThreshold) {
        return {
          type: "output_quality_degraded",
          message: `Batch output quality dropped to ${outputQuality.toFixed(3)}.`,
        };
      }

      const toolFailureRate = this.computeToolFailureRate(completedInBatch);
      if (toolFailureRate > input.toolFailureRateThreshold) {
        return {
          type: "tool_failure_pattern",
          message: `Batch tool failure rate reached ${toolFailureRate.toFixed(3)}.`,
        };
      }
    }

    const evaluation = this.executionEvaluator?.evaluate({
      runId: input.runId,
      executionPlan: input.executionPlan,
      completedSteps: input.steps,
    });
    if (
      evaluation &&
      evaluation.score < input.evaluationScoreThreshold
    ) {
      return {
        type: "evaluation_score_drop",
        message: `Execution evaluation dropped to ${evaluation.score.toFixed(3)}.`,
        evaluationScore: evaluation.score,
      };
    }

    return null;
  }

  private async replanExecution(input: {
    runId: string;
    executionPlan: ExecutionPlan;
    replanning: ExecutionReplanningContext;
    completedResults: Map<string, AgentExecutionResult>;
    reason: ExecutionReplanningReason;
    replanCount: number;
  }) {
    const completedSteps = input.executionPlan.executableSteps.filter(
      (step) => step.status === "completed"
    );
    const failedSteps = input.executionPlan.executableSteps.filter(
      (step) => step.status === "failed"
    );
    const objective = this.buildReplanningObjective(
      input.executionPlan,
      completedSteps,
      failedSteps,
      input.reason,
      input.replanCount
    );

    const replanned = await this.planningService!.createPlan({
      tenantId: input.replanning.tenantId,
      project: input.replanning.project,
      objective,
      scan: input.replanning.scan,
      risks: input.replanning.risks,
    });

    const mergedPlan = this.mergePlans({
      previousPlan: input.executionPlan.sourcePlan,
      newPlan: replanned.plan,
      completedSteps,
      replanCount: input.replanCount,
    });
    const executionPlan = this.executionPlanCompiler.compile({
      tenantId: input.replanning.tenantId,
      plan: mergedPlan,
      risks: input.replanning.risks,
    });

    for (const step of executionPlan.executableSteps) {
      const completedStep = completedSteps.find((candidate) => candidate.id === step.id);
      if (!completedStep) continue;

      step.status = "completed";
      step.result = completedStep.result;
      step.error = completedStep.error;
      step.startedAt = completedStep.startedAt;
      step.finishedAt = completedStep.finishedAt;
      step.context.dependencyResults = Object.fromEntries(
        completedStep.dependencies
          .map((dependency) => [dependency, input.completedResults.get(dependency)])
          .filter((entry) => entry[1])
      );
    }

    this.log("execution_replanning_completed", {
      runId: input.runId,
      replanCount: input.replanCount,
      previousPlanId: input.executionPlan.sourcePlan.metadata?.planId ?? null,
      newPlanId: executionPlan.sourcePlan.metadata?.planId ?? null,
      newPlanVersion: executionPlan.sourcePlan.metadata?.planVersion ?? null,
    });

    return { executionPlan };
  }

  private async executeStep(input: {
    runId: string;
    planId: string;
    step: ExecutionStep;
    retryLimit: number;
    completedResults: Map<string, AgentExecutionResult>;
    directive?: PhaseExecutionDirective;
    options?: ExecutionRuntimeOptions;
  }) {
    const { step } = input;
    const phaseRun = await this.phaseRunRepo.create(
      input.runId,
      `${step.input.phase}:${step.id}`
    );

    const agent = this.agents.findByName(step.agent);
    if (!agent) {
      throw new ExecutionRuntimeError(`Unknown agent "${step.agent}" for step ${step.id}.`);
    }

    step.status = "running";
    step.startedAt = new Date().toISOString();
    step.context.dependencyResults = Object.fromEntries(
      step.dependencies
        .map((dependency) => [dependency, input.completedResults.get(dependency)])
        .filter((entry) => entry[1])
    );

    await this.phaseRunRepo.markRunning(phaseRun.id);
    this.log("execution_step_started", {
      stepId: step.id,
      agent: step.agent,
      dependencies: step.dependencies,
      phase: step.input.phase,
    });

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= input.retryLimit; attempt += 1) {
      try {
        this.applyDirectivePolicy(step, input.directive);
        const result = await agent.execute({
          step: {
            id: step.id,
            title: step.input.title,
            summary: step.input.summary,
            type: step.type,
            expectedOutput: step.expectedOutput,
            dependencies: step.dependencies,
            objective: step.input.objective,
            phase: step.input.phase,
            risk: step.input.risk,
          },
          executionContext: {
            tenantId: step.context.tenantId,
            project: step.context.project,
            mode: "step_execution",
            dependencyResults: step.context.dependencyResults,
            metadata: {
              planConfidence: step.context.planConfidence,
              reasoningSummary: step.context.reasoningSummary,
              risks: step.context.risks,
              directive: input.directive,
              sandbox: {
                writableRoots: input.options?.writableRoots ?? [step.context.project.rootPath],
                protectedPaths: input.options?.protectedPaths ?? [],
              },
              limits: {
                maxToolCalls: input.options?.maxToolCallsPerStep,
              },
              guardrails: {
                allowDestructiveCommands: input.options?.allowDestructiveCommands ?? false,
              },
              manualOverride: input.options?.control?.manualOverride ?? null,
            },
          },
          dependencyResults: step.context.dependencyResults,
        });

        step.status = "completed";
        step.result = result;
        step.error = undefined;
        step.finishedAt = new Date().toISOString();

        const operationalSummary = {
          phase: step.input.phase,
          stepId: step.id,
          status: "success",
          agent: step.agent,
          type: step.type,
          executionMode: input.directive?.executionMode ?? "standard",
          expectedOutput: step.expectedOutput,
          dependencies: step.dependencies,
          retriesUsed: attempt,
        };

        await this.phaseRunRepo.finish(phaseRun.id, "success", {
          details: step.input.summary,
          logs: [
            `step:${step.id}:completed`,
            `agent:${step.agent}`,
            `attempt:${attempt + 1}`,
          ],
          outputs: {
            executionStep: this.toStepPayload(step),
            result: result.result,
            logs: result.logs,
            toolUsageTrace: result.toolUsageTrace,
            operational: operationalSummary,
          } as Prisma.InputJsonValue,
        });

        this.log("execution_step_completed", {
          stepId: step.id,
          agent: step.agent,
          retriesUsed: attempt,
        });

        if (this.memoryIndexer) {
          await this.memoryIndexer.storeMemory(
            {
              scope: "project",
              category: "execution",
              content: this.describeExecutionResult(step, result),
              metadata: {
                runId: input.runId,
                relatedPlanId: input.planId || null,
                stepId: step.id,
                agent: step.agent,
                type: step.type,
                status: step.status,
                toolSequence:
                  result.toolUsageTrace.map((trace) => trace.toolName).join(" -> ") || null,
              },
            },
            {
              tenantId: step.context.tenantId,
              projectId: step.context.project.id,
            }
          );
        }

        return { step, operationalSummary };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown execution error");
        step.error = {
          message: lastError.message,
          retryable: attempt < input.retryLimit,
        };

        if (attempt === input.retryLimit) {
          step.status = "failed";
          step.finishedAt = new Date().toISOString();

          const operationalSummary = {
            phase: step.input.phase,
            stepId: step.id,
            status: "failed",
            agent: step.agent,
            type: step.type,
            executionMode: input.directive?.executionMode ?? "standard",
            expectedOutput: step.expectedOutput,
            dependencies: step.dependencies,
            retriesUsed: attempt,
          };

          await this.phaseRunRepo.finish(phaseRun.id, "failed", {
            error: lastError.message,
            details: step.input.summary,
            outputs: {
              executionStep: this.toStepPayload(step),
              operational: operationalSummary,
            } as Prisma.InputJsonValue,
          });

          this.log("execution_step_failed", {
            stepId: step.id,
            agent: step.agent,
            error: lastError.message,
            retriesUsed: attempt,
          });

          return { step, operationalSummary };
        }
      }
    }

    throw new ExecutionRuntimeError(
      `Execution loop exited unexpectedly for step ${step.id}: ${
        lastError?.message ?? "unknown error"
      }`
    );
  }

  private applyDirectivePolicy(
    step: ExecutionStep,
    directive: PhaseExecutionDirective | undefined
  ) {
    if (!directive) return;

    if (
      directive.executionMode === "architecture_guarded" &&
      step.type === "modification" &&
      step.input.risk === "HIGH"
    ) {
      throw new ExecutionRuntimeError(
        `Architecture policy blocked high-risk modification step ${step.id}.`
      );
    }

    if (
      directive.executionMode === "governance_guarded" &&
      ["modification", "generation"].includes(step.type) &&
      ["MEDIUM", "HIGH"].includes(step.input.risk)
    ) {
      throw new ExecutionRuntimeError(
        `Governance policy blocked step ${step.id} pending granular approval.`
      );
    }
  }

  private markBlockedDependents(
    steps: ExecutionStep[],
    stepMap: Map<string, ExecutionStep>,
    failureMode: ExecutionFailureMode
  ) {
    if (failureMode !== "partial") return;

    for (const step of steps) {
      if (step.status !== "pending") continue;

      const failedDependency = step.dependencies.find(
        (dependency) => stepMap.get(dependency)?.status === "failed"
      );
      if (!failedDependency) continue;

      step.status = "failed";
      step.finishedAt = new Date().toISOString();
      step.error = {
        message: `Dependency ${failedDependency} failed.`,
        retryable: false,
      };
      this.log("execution_step_failed", {
        stepId: step.id,
        agent: step.agent,
        error: step.error.message,
        reason: "dependency_failed",
      });
    }
  }

  private toStepPayload(step: ExecutionStep) {
    return {
      id: step.id,
      agent: step.agent,
      type: step.type,
      input: step.input,
      expectedOutput: step.expectedOutput,
      dependencies: step.dependencies,
      status: step.status,
      result: step.result,
      error: step.error,
      startedAt: step.startedAt,
      finishedAt: step.finishedAt,
      context: {
        tenantId: step.context.tenantId,
        project: step.context.project,
        objective: step.context.objective,
        planConfidence: step.context.planConfidence,
        reasoningSummary: step.context.reasoningSummary,
        step: step.context.step,
        dependencyResults: step.context.dependencyResults,
      },
    };
  }

  private log(event: string, payload: Record<string, unknown>) {
    console.info(
      JSON.stringify({
        scope: "maestro.execution",
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      })
    );
  }

  private describeExecutionResult(
    step: ExecutionStep,
    result: AgentExecutionResult
  ) {
    return [
      `Step: ${step.input.title}`,
      `Agent: ${step.agent}`,
      `Type: ${step.type}`,
      `Expected output: ${step.expectedOutput}`,
      `Summary: ${step.input.summary}`,
      `Result: ${JSON.stringify(result.result)}`,
      `Logs: ${result.logs.join(" | ")}`,
    ].join("\n");
  }

  private buildPerformanceRecords(steps: ExecutionStep[]) {
    const records: Array<{
      content: string;
      metadata: Record<string, string | number | boolean | null>;
    }> = [];
    const agentGroups = new Map<string, ExecutionStep[]>();
    const toolGroups = new Map<string, Array<{ success: boolean; durationMs: number }>>();

    for (const step of steps) {
      const agentSteps = agentGroups.get(step.agent) ?? [];
      agentSteps.push(step);
      agentGroups.set(step.agent, agentSteps);

      for (const trace of step.result?.toolUsageTrace ?? []) {
        const toolRuns = toolGroups.get(trace.toolName) ?? [];
        toolRuns.push({
          success: trace.status === "success",
          durationMs: trace.durationMs,
        });
        toolGroups.set(trace.toolName, toolRuns);
      }
    }

    for (const [agent, agentSteps] of agentGroups.entries()) {
      const completed = agentSteps.filter((step) => step.status === "completed").length;
      records.push({
        content: [
          `Agent: ${agent}`,
          `Completed steps: ${completed}/${agentSteps.length}`,
        ].join("\n"),
        metadata: {
          entityType: "agent",
          entityName: agent,
          successRate: agentSteps.length === 0 ? 0 : Number((completed / agentSteps.length).toFixed(3)),
          totalSteps: agentSteps.length,
        },
      });
    }

    for (const [toolName, toolRuns] of toolGroups.entries()) {
      const successes = toolRuns.filter((run) => run.success).length;
      const averageDuration =
        toolRuns.reduce((total, run) => total + run.durationMs, 0) / toolRuns.length;
      records.push({
        content: [
          `Tool: ${toolName}`,
          `Successful calls: ${successes}/${toolRuns.length}`,
          `Average duration: ${averageDuration.toFixed(2)}ms`,
        ].join("\n"),
        metadata: {
          entityType: "tool",
          entityName: toolName,
          successRate: Number((successes / toolRuns.length).toFixed(3)),
          totalCalls: toolRuns.length,
          averageDurationMs: Number(averageDuration.toFixed(2)),
        },
      });
    }

    return records;
  }

  private buildExecutionMetrics(
    steps: ExecutionStep[],
    evaluation?: { score: number } | null
  ) {
    const completed = steps.filter((step) => step.status === "completed");
    const failed = steps.filter((step) => step.status === "failed");
    const successRate = steps.length === 0 ? 0 : completed.length / steps.length;
    const agentPerformance = Array.from(
      steps.reduce<Map<string, { total: number; completed: number }>>((acc, step) => {
        const current = acc.get(step.agent) ?? { total: 0, completed: 0 };
        current.total += 1;
        if (step.status === "completed") current.completed += 1;
        acc.set(step.agent, current);
        return acc;
      }, new Map())
    ).map(([agent, stats]) => ({
      agent,
      successRate: stats.total === 0 ? 0 : Number((stats.completed / stats.total).toFixed(3)),
      totalSteps: stats.total,
    }));

    return {
      successRate: Number(successRate.toFixed(3)),
      planScore: Number(steps[0]?.context.planConfidence?.toFixed?.(3) ?? 0),
      executionScore: Number((evaluation?.score ?? 0).toFixed(3)),
      completedSteps: completed.length,
      failedSteps: failed.length,
      agentPerformance,
    };
  }

  private computeOutputQuality(steps: ExecutionStep[]) {
    const outputs = steps.map((step) => {
      const result = step.result?.result ?? {};
      return Object.values(result).some((value) => value !== null && value !== "");
    });
    if (outputs.length === 0) {
      return 1;
    }
    return outputs.filter(Boolean).length / outputs.length;
  }

  private computeToolFailureRate(steps: ExecutionStep[]) {
    const traces = steps.flatMap((step) => step.result?.toolUsageTrace ?? []);
    if (traces.length === 0) {
      return 0;
    }
    const failed = traces.filter((trace) => trace.status === "failed").length;
    return failed / traces.length;
  }

  private async abortExecution(
    input: {
      runId: string;
      executionPlan: ExecutionPlan;
      options?: ExecutionRuntimeOptions;
    },
    reason: string
  ) {
    this.log("execution_aborted", {
      runId: input.runId,
      reason,
    });

    if (!this.rollbackStrategy) {
      return;
    }

    await this.rollbackStrategy.rollback({
      runId: input.runId,
      projectRoot:
        input.executionPlan.sourcePlan.project?.rootPath ??
        input.executionPlan.executableSteps[0]?.context.project.rootPath ??
        ".",
      reason,
    });
  }

  private buildReplanningObjective(
    executionPlan: ExecutionPlan,
    completedSteps: ExecutionStep[],
    failedSteps: ExecutionStep[],
    reason: ExecutionReplanningReason,
    replanCount: number
  ) {
    const partialResults = completedSteps
      .map((step) => `${step.id}:${JSON.stringify(step.result?.result ?? {})}`)
      .join(" | ");
    const failureContext = failedSteps
      .map((step) => `${step.id}:${step.error?.message ?? "failed"}`)
      .join(" | ");
    const raw = [
      executionPlan.sourcePlan.objective.raw,
      `Replan iteration ${replanCount}.`,
      `Reason: ${reason.message}`,
      `Completed results: ${partialResults || "none"}`,
      `Failures: ${failureContext || "none"}`,
    ].join(" ");

    return {
      ...executionPlan.sourcePlan.objective,
      raw,
      normalized: raw.trim().toLowerCase(),
    };
  }

  private mergePlans(input: {
    previousPlan: ExecutionPlan["sourcePlan"];
    newPlan: ExecutionPlan["sourcePlan"];
    completedSteps: ExecutionStep[];
    replanCount: number;
  }) {
    const completedStepIds = new Set(input.completedSteps.map((step) => step.id));
    const preservedSteps = input.previousPlan.steps.filter((step) =>
      completedStepIds.has(step.id)
    );
    const replannedStepIdMap = new Map<string, string>();
    const replannedSteps = input.newPlan.steps.map((step, index) => {
      const nextId = `replan-${input.replanCount}-${step.id}`;
      replannedStepIdMap.set(step.id, nextId);
      return {
        ...step,
        id: nextId,
        order: preservedSteps.length + index + 1,
      };
    });
    const normalizedReplannedSteps = replannedSteps.map((step) => ({
      ...step,
      dependencies: step.dependencies.map(
        (dependency) => replannedStepIdMap.get(dependency) ?? dependency
      ),
    }));
    const mergedSteps = [
      ...preservedSteps.map((step, index) => ({
        ...step,
        order: index + 1,
      })),
      ...normalizedReplannedSteps,
    ];

    return {
      ...input.newPlan,
      objective: input.previousPlan.objective,
      project: input.previousPlan.project,
      steps: mergedSteps,
      agentsRequired: Array.from(new Set(mergedSteps.map((step) => step.agent))),
      dependencies: mergedSteps.map((step) => ({
        stepId: step.id,
        dependsOn: [...step.dependencies],
      })),
      metadata: {
        ...input.newPlan.metadata,
        previousPlanId: String(input.previousPlan.metadata.planId ?? ""),
        planVersion: Number(input.previousPlan.metadata.planVersion ?? 1) + 1,
        replanCount: input.replanCount,
      },
    };
  }
}
