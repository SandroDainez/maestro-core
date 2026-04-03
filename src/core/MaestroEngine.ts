import path from "path";

import {
  MaestroJob,
  AutopilotScanOutput,
  MaestroMode,
  MaestroProject,
  type PhaseExecutionDirective,
} from "../types";

import { ensureDir } from "../utils/fsx";

import { AutopilotScanner } from "../autopilot/AutopilotScanner";
import { RiskEngine } from "../autopilot/RiskEngine";
import { ReportGenerator } from "../autopilot/ReportGenerator";
import { RiskGate } from "../autopilot/RiskGate";
import { PreviewEngine } from "../autopilot/PreviewEngine";

import { ProjectRegistry } from "./projects/ProjectRegistry";
import { PlanningService } from "./planning/PlanningService";
import { LocalMemoryRetrieval } from "./planning/adapters/LocalMemoryRetrieval";
import { OpenAIPlannerModel } from "../infrastructure/ai/OpenAIPlannerModel";
import { ExecutionPlanCompiler } from "./execution/ExecutionPlanCompiler";
import { ExecutionRuntime } from "./execution/ExecutionRuntime";
import { RuleBasedPlanEvaluator } from "./evaluation/RuleBasedPlanEvaluator";
import { RuleBasedExecutionEvaluator } from "./evaluation/RuleBasedExecutionEvaluator";

import { TenantRepository } from "../db/tenant.repository";
import { ProjectRepository } from "../db/project.repository";
import { RunRepository } from "../db/repositories/run.repo";
import { PhaseRunRepository } from "../db/phase-run.repository";
import type { Objective, Plan } from "./planning/types";

type AutopilotPlanningOutput = AutopilotScanOutput & {
  plan: Plan;
  tenantId: string;
};

export class MaestroEngine {
  private registry = new ProjectRegistry();
  private executionCompiler = new ExecutionPlanCompiler();

  private tenantRepo = new TenantRepository();
  private projectRepo = new ProjectRepository();
  private runRepo = new RunRepository();
  private phaseRunRepo = new PhaseRunRepository();

  private scanner = new AutopilotScanner();
  private riskEngine = new RiskEngine();
  private reporter = new ReportGenerator();
  private memoryRetrieval = new LocalMemoryRetrieval();
  private planning = new PlanningService(
    new OpenAIPlannerModel(),
    this.memoryRetrieval,
    undefined,
    this.memoryRetrieval,
    new RuleBasedPlanEvaluator()
  );

  private gate = new RiskGate();
  private preview = new PreviewEngine();
  private runtime = new ExecutionRuntime(this.phaseRunRepo, {
    memoryIndexer: this.memoryRetrieval,
    executionEvaluator: new RuleBasedExecutionEvaluator(),
  });

  // ======================================
  // AUTOPILOT SCAN
  // ======================================

  async autopilotScan(
    projectPath: string,
    mode: MaestroMode = MaestroMode.PLAN,
    objectiveText?: string
  ): Promise<AutopilotPlanningOutput> {
    const tenant = await this.tenantRepo.ensureDefaultTenant();

    const dbProject = await this.projectRepo.upsertByPath(tenant.id, projectPath);

    const project: MaestroProject = {
      id: dbProject.id,
      name: dbProject.name,
      rootPath: dbProject.path,
      currentPhase: "scan",
      createdAt: dbProject.createdAt,
    };

    // ✅ REGISTRA e define ativo (método espera string)
    this.registry.registerProject(project);
    this.registry.setActiveProject(project.id);

    const scan = this.scanner.scan(projectPath);
    const risks = this.riskEngine.evaluate(scan);
    const objective = this.buildObjective(projectPath, mode, objectiveText);
    const { plan } = await this.planning.createPlan({
      tenantId: tenant.id,
      project,
      objective,
      scan,
      risks,
    });
    const jobs: MaestroJob[] = plan.jobs;

    const runId = `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const runDir = path.join(projectPath, "maestro-runs", runId);
    ensureDir(runDir);

    const previews = await this.preview.generate();

    const output: AutopilotScanOutput = {
      project,
      scan,
      risks,
      jobs,
      runId,
      runDir,
      previews,
      reportMarkdownPath: path.join(runDir, "plan.md"),
      reportJsonPath: path.join(runDir, "run.json"),
    };

    const { mdPath, jsonPath } = this.reporter.write(runDir, output);
    output.reportMarkdownPath = mdPath;
    output.reportJsonPath = jsonPath;

    if (mode === MaestroMode.EXECUTE && !this.gate.allowExecution(risks)) {
      throw new Error("🚫 Execução bloqueada: risco HIGH detectado.");
    }

    return {
      ...output,
      plan,
      tenantId: tenant.id,
    };
  }

  private buildObjective(
    projectPath: string,
    mode: MaestroMode,
    rawObjective?: string
  ): Objective {
    const fallback =
      rawObjective?.trim() ||
      (mode === MaestroMode.EXECUTE
        ? "Executar a proxima evolucao do projeto atual"
        : "Planejar a proxima evolucao do projeto atual");
    const intent =
      mode === MaestroMode.EXECUTE ? "execute" : "plan";

    return {
      raw: fallback,
      normalized: fallback.trim().toLowerCase(),
      intent,
      dryRun: mode !== MaestroMode.EXECUTE,
      projectPath,
    };
  }

  // ======================================
  // EXECUTAR JOBS
  // ======================================

  async executeJobs(
    projectId: string,
    jobs: MaestroJob[],
    analysis?: Record<string, unknown>,
    plan?: Plan,
    tenantId = "default"
  ) {
    const run = await this.runRepo.create(
      projectId,
      "autopilot_execute",
      analysis as any
    );

    try {
      const blockedPhases = Array.isArray(analysis?.blockedPhases)
        ? analysis?.blockedPhases.map((item) => String(item))
        : [];
      const executionControl =
        analysis?.executionControl && typeof analysis.executionControl === "object"
          ? (analysis.executionControl as Record<string, unknown>)
          : {};
      const executionContext =
        analysis?.executionContext && typeof analysis.executionContext === "object"
          ? (analysis.executionContext as Record<string, unknown>)
          : {};
      const replanningScan =
        executionContext.scan && typeof executionContext.scan === "object"
          ? (executionContext.scan as Record<string, unknown>)
          : null;
      const replanningRisks = Array.isArray(executionContext.risks)
        ? executionContext.risks
        : [];
      const phaseDirectives: PhaseExecutionDirective[] = Array.isArray(analysis?.phaseDirectives)
        ? analysis.phaseDirectives
            .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
            .map((item) => ({
              phase: String(item.phase ?? ""),
              ownerAgent: String(item.ownerAgent ?? "Maestro-Orchestrator"),
              executionMode: (
                String(item.executionMode ?? "standard") as PhaseExecutionDirective["executionMode"]
              ),
              verdict: String(item.verdict ?? "ok"),
              notes: Array.isArray(item.notes) ? item.notes.map((note) => String(note)) : [],
            }))
        : [];
      const effectivePlan = plan ?? this.toPlanFromJobs(projectId, jobs);
      const executionPlan = this.executionCompiler.compile({
        tenantId,
        plan: effectivePlan,
        risks: [],
      });
      const blockedStep = executionPlan.executableSteps.find((step) =>
        blockedPhases.includes(step.input.phase)
      );

      if (blockedStep) {
        await this.runRepo.finish(run.id, "failed", {
          ...(analysis ?? {}),
          blockedPhase: blockedStep.input.phase,
          blockedStep: blockedStep.id,
        } as any);
        throw new Error(
          `Fase bloqueada pela revisão multi-agente: ${blockedStep.input.phase}`
        );
      }

      const runtimeResult = await this.runtime.execute({
        runId: run.id,
        executionPlan,
        phaseDirectives,
        options: {
          maxSteps:
            typeof executionControl.maxSteps === "number"
              ? Number(executionControl.maxSteps)
              : undefined,
          allowedPhases: Array.isArray(executionControl.allowedPhases)
            ? executionControl.allowedPhases.map((item) => String(item))
            : undefined,
        },
        replanning:
          executionControl.replanningEnabled === false || !replanningScan
            ? undefined
            : {
                tenantId,
                project: {
                  id: effectivePlan.project.id,
                  name: effectivePlan.project.name,
                  rootPath: effectivePlan.project.rootPath,
                  currentPhase: effectivePlan.project.currentPhase,
                  createdAt: new Date(),
                },
                scan: replanningScan as any,
                risks: replanningRisks as any,
                maxReplans:
                  typeof executionControl.maxReplans === "number"
                    ? Number(executionControl.maxReplans)
                    : 2,
                evaluationScoreThreshold:
                  typeof executionControl.evaluationScoreThreshold === "number"
                    ? Number(executionControl.evaluationScoreThreshold)
                    : 0.55,
                outputQualityThreshold:
                  typeof executionControl.outputQualityThreshold === "number"
                    ? Number(executionControl.outputQualityThreshold)
                    : 0.45,
                toolFailureRateThreshold:
                  typeof executionControl.toolFailureRateThreshold === "number"
                    ? Number(executionControl.toolFailureRateThreshold)
                    : 0.4,
              },
      });

      await this.runRepo.finish(run.id, "success", {
        ...(analysis ?? {}),
        executionPlan: {
          executionOrder: executionPlan.executionOrder,
          agentAssignments: executionPlan.agentAssignments,
          metadata: executionPlan.metadata,
        },
        operationalSummary: this.buildOperationalSummary(
          runtimeResult.phaseSummaries,
          executionPlan.executableSteps.length
        ),
        observability: {
          trace: runtimeResult.trace,
          metrics: runtimeResult.metrics,
          replanning: runtimeResult.replanning,
          control: runtimeResult.control,
        },
        audit: {
          decisions: runtimeResult.trace.decisionPath,
          evaluations: {
            execution: runtimeResult.evaluation,
          },
          planVersions: [
            {
              planId: executionPlan.sourcePlan.metadata?.planId ?? null,
              planVersion: executionPlan.sourcePlan.metadata?.planVersion ?? 1,
            },
            ...runtimeResult.replanning.events.map((event) => ({
              planId: event.newPlanId ?? null,
              planVersion: event.planVersion ?? null,
            })),
          ],
        },
      } as any);
    } catch {
      // já registramos o estado failed no banco acima
    }

    return run.id;
  }

  private buildOperationalSummary(
    phaseSummaries: Array<Record<string, unknown>>,
    totalPlannedPhases: number
  ) {
    const specializedCount = phaseSummaries.filter(
      (item) => item.source === "specialized"
    ).length;
    const advisoryCount = phaseSummaries.filter((item) => item.advisory === true).length;
    const blockedCount = phaseSummaries.filter((item) => item.status === "failed").length;
    const runners = Array.from(
      new Set(
        phaseSummaries.map((item) => String(item.runner ?? item.agent ?? "unknown"))
      )
    );
    const guards = Array.from(
      new Set(
        phaseSummaries.flatMap((item) =>
          Array.isArray(item.guards) ? item.guards.map((guard) => String(guard)) : []
        )
      )
    );

    return {
      totalPlannedPhases,
      executedPhases: phaseSummaries.length,
      specializedCount,
      advisoryCount,
      blockedCount,
      runners,
      guards,
      phases: phaseSummaries,
    };
  }

  private toPlanFromJobs(projectId: string, jobs: MaestroJob[]): Plan {
    const project = this.registry.getProject(projectId);
    let order = 0;

    const steps = jobs.flatMap((job) =>
      job.tasks.map((task, index) => {
        order += 1;
        return {
          id: `${job.phase}-${index + 1}`,
          title: task.action.name,
          summary: task.action.name,
          phase: job.phase,
          type:
            task.action.type === "plan"
              ? "analysis"
              : task.action.type === "scaffold"
              ? "generation"
              : task.action.type === "config"
              ? "modification"
              : "validation",
          order,
          agent: "Maestro-Orchestrator",
          dependencies: [],
          risk:
            task.action.risk === "HIGH"
              ? "HIGH"
              : task.action.risk === "MEDIUM"
              ? "MEDIUM"
              : "LOW",
          expectedOutput: task.action.name,
        } as Plan["steps"][number];
      })
    );

    return {
      objective: {
        raw: "Legacy execution plan",
        normalized: "legacy execution plan",
        intent: "execute",
        dryRun: false,
        projectPath: project?.rootPath ?? ".",
      },
      project: {
        id: projectId,
        name: project?.name ?? projectId,
        rootPath: project?.rootPath ?? ".",
        currentPhase: project?.currentPhase ?? "execute",
      },
      goals: ["Execute precompiled legacy jobs"],
      steps,
      agentsRequired: ["Maestro-Orchestrator"],
      dependencies: steps.map((step) => ({ stepId: step.id, dependsOn: [] })),
      risks: [],
      confidence: 0.1,
      reasoningSummary: "Legacy execution plan compiled from existing jobs.",
      jobs,
      phases: jobs.map((job) => ({
        phase: job.phase,
        summary: `${job.tasks.length} task(s) planned for phase ${job.phase}.`,
        taskCount: job.tasks.length,
      })),
      summary: {
        totalJobs: jobs.length,
        totalTasks: jobs.reduce((acc, job) => acc + job.tasks.length, 0),
        highRiskCount: jobs.reduce(
          (acc, job) =>
            acc +
            job.tasks.filter((task) => task.action.risk === "HIGH").length,
          0
        ),
      },
      metadata: {
        planner: "legacy-jobs",
      },
    };
  }
}
