import { MaestroEngine } from "../MaestroEngine";
import { HumanRequestParser } from "./HumanRequestParser";
import { MaestroMode, type AutopilotScanOutput } from "../../types";
import { MemoryManager } from "../memory/MemoryManager";
import { ApprovalGate } from "../governance/ApprovalGate";
import { GovernancePolicy } from "../governance/GovernancePolicy";
import { AuditLogger } from "../governance/AuditLogger";
import {
  MultiAgentCoordinator,
  type MultiAgentReview,
} from "./MultiAgentCoordinator";

type ProjectSummary = {
  id: string;
  name: string;
  rootPath: string;
};

type JobSummary = {
  id: string;
  phase: string;
  taskCount: number;
  taskIds: string[];
};

type WorkflowStage = {
  code: "scan" | "plan" | "review" | "approval" | "execute";
  status: "pending" | "completed" | "blocked" | "skipped";
  note: string;
};

type MaestroBaseResponse = {
  project: ProjectSummary;
  runId: string;
  runDir: string;
  scan: AutopilotScanOutput["scan"];
  risks: AutopilotScanOutput["risks"];
  jobs: JobSummary[];
  reportMarkdownPath: string;
  reportJsonPath: string;
  workflow: WorkflowStage[];
};

export type MaestroScanResponse = MaestroBaseResponse & {
  intent: "scan";
  mode: "plan";
};

export type MaestroPlanResponse = MaestroBaseResponse & {
  intent: "plan";
  mode: "plan";
  summary: {
    totalRisks: number;
    highRisks: number;
    totalJobs: number;
    totalTasks: number;
  };
  memoryInsights: {
    codingStyle?: string;
    defaultDomain?: string;
    recentProjects: string[];
    recentDecisionCount: number;
  };
  multiAgentReview: MultiAgentReview;
};

export type MaestroRunResponse = MaestroBaseResponse & {
  intent: "execute";
  mode: "plan" | "execute";
  execution: {
    status: "planned" | "executed" | "approval_required";
    runRecordId?: string;
  };
  multiAgentReview: MultiAgentReview;
  governance: {
    highRiskCount: number;
    mediumRiskCount: number;
    requiresHumanApproval: boolean;
    approvalToken?: string;
    approvalReason?: string;
  };
};

export type MaestroReportResponse = MaestroBaseResponse & {
  intent: "report";
  mode: "plan";
  report: {
    objective?: string;
    recommendation: string;
    readiness: "low" | "moderate" | "high";
    blockers: string[];
    memorySummary: string;
  };
  multiAgentReview: MultiAgentReview;
};

export type HumanRequestResponse =
  | MaestroScanResponse
  | MaestroPlanResponse
  | MaestroRunResponse
  | MaestroReportResponse;

export class MaestroOrchestrator {
  private engine = new MaestroEngine();
  private parser = new HumanRequestParser();
  private memory = new MemoryManager();
  private approvalGate = new ApprovalGate();
  private audit = new AuditLogger();
  private agents = new MultiAgentCoordinator();

  async scanProject(projectPath: string): Promise<MaestroScanResponse> {
    const output = await this.engine.autopilotScan(projectPath, MaestroMode.PLAN);
    this.memory.markProjectUsed(projectPath);
    return {
      intent: "scan",
      mode: "plan",
      ...this.toBaseResponse(output),
      workflow: this.buildWorkflow({ executed: false, approvalRequired: false }),
    };
  }

  async planProject(projectPath: string): Promise<MaestroPlanResponse> {
    const output = await this.engine.autopilotScan(projectPath, MaestroMode.PLAN);
    this.memory.markProjectUsed(projectPath);
    const base = this.toBaseResponse(output);
    const multiAgentReview = this.agents.reviewPlan({
      jobs: output.jobs,
      risks: output.risks,
      recentDecisions: this.memory.getDecisions().slice(-10),
    });

    return {
      intent: "plan",
      mode: "plan",
      ...base,
      workflow: this.buildWorkflow({ executed: false, approvalRequired: false }),
      summary: {
        totalRisks: output.risks.length,
        highRisks: output.risks.filter((risk) => risk.risk === "HIGH").length,
        totalJobs: output.jobs.length,
        totalTasks: output.jobs.reduce((acc, job) => acc + job.tasks.length, 0),
      },
      memoryInsights: {
        codingStyle: this.memory.getAllPreferences().codingStyle,
        defaultDomain: this.memory.getAllPreferences().defaultDomain,
        recentProjects: this.memory.getRecentProjects(),
        recentDecisionCount: this.memory.getDecisions().length,
      },
      multiAgentReview,
    };
  }

  async reportProject(
    projectPath: string,
    objective?: string
  ): Promise<MaestroReportResponse> {
    const output = await this.engine.autopilotScan(projectPath, MaestroMode.PLAN);
    this.memory.markProjectUsed(projectPath);
    const base = this.toBaseResponse(output);
    const blockers = output.risks
      .filter((risk) => risk.risk === "HIGH")
      .map((risk) => `${risk.title}: ${risk.detail}`);

    const readiness =
      blockers.length > 0
        ? "low"
        : output.risks.some((risk) => risk.risk === "MEDIUM")
        ? "moderate"
        : "high";
    const multiAgentReview = this.agents.reviewPlan({
      jobs: output.jobs,
      risks: output.risks,
      objective,
      recentDecisions: this.memory.getDecisions().slice(-10),
    });

    return {
      intent: "report",
      mode: "plan",
      ...base,
      workflow: this.buildWorkflow({ executed: false, approvalRequired: false }),
      report: {
        objective,
        readiness,
        blockers,
        recommendation:
          readiness === "low"
            ? "Corrija os riscos altos antes de executar automaticamente."
            : readiness === "moderate"
            ? "O projeto pode evoluir, mas ainda pede estabilizacao e validacao manual."
            : "O projeto esta estruturalmente pronto para uma automacao incremental.",
        memorySummary: this.buildMemorySummary(),
      },
      multiAgentReview,
    };
  }

  async runProject(
    projectPath: string,
    autoExecute = true,
    approved = false,
    approvedPhases: string[] = [],
    actor = "system"
  ): Promise<MaestroRunResponse> {
    const mode = autoExecute ? MaestroMode.EXECUTE : MaestroMode.PLAN;
    const output = await this.engine.autopilotScan(projectPath, mode);
    this.memory.markProjectUsed(projectPath);
    this.memory.recordDecision(
      `runProject path=${projectPath} autoExecute=${autoExecute} approved=${approved}`
    );

    const base = this.toBaseResponse(output);
    const governance = GovernancePolicy.summarizeExecution(output.risks);
    const multiAgentReview = this.agents.reviewPlan({
      jobs: output.jobs,
      risks: output.risks,
      recentDecisions: this.memory.getDecisions().slice(-10),
    });
    const blockedPhases = multiAgentReview.phaseReviews
      .filter((phase) => phase.verdict === "blocked")
      .map((phase) => phase.phase);
    const remainingBlockedPhases = blockedPhases.filter(
      (phase) => !approvedPhases.includes(phase)
    );
    const approval = this.approvalGate.evaluate({
      autoExecute,
      approved,
      risks: output.risks,
    });

    this.audit.log({
      type: "human_request",
      actor,
      projectPath,
      runId: output.runId,
      details: {
        action: "runProject",
        autoExecute,
        approved,
        approvedPhases,
      },
    });

    if (!autoExecute) {
      return {
        intent: "execute",
        mode: "plan",
        ...base,
        workflow: this.buildWorkflow({ executed: false, approvalRequired: false }),
        execution: {
          status: "planned",
        },
        governance,
        multiAgentReview,
      };
    }

    if (approval.required) {
      this.audit.log({
        type: "approval_required",
        actor,
        projectPath,
        runId: output.runId,
        details: {
          reason: approval.reason,
          token: approval.token,
          highRiskCount: governance.highRiskCount,
        },
      });

      return {
        intent: "execute",
        mode: "plan",
        ...base,
        workflow: this.buildWorkflow({ executed: false, approvalRequired: true }),
        execution: {
          status: "approval_required",
        },
        governance: {
          ...governance,
          approvalToken: approval.token,
          approvalReason: approval.reason,
        },
        multiAgentReview,
      };
    }

    if (remainingBlockedPhases.length > 0 && !approved) {
      this.audit.log({
        type: "execution_blocked",
        actor,
        projectPath,
        runId: output.runId,
        details: {
          blockedPhases: remainingBlockedPhases,
          reason: "Phase review returned blocked verdict.",
        },
      });

      return {
        intent: "execute",
        mode: "plan",
        ...base,
        workflow: this.buildWorkflow({ executed: false, approvalRequired: true }),
        execution: {
          status: "approval_required",
        },
        governance: {
          ...governance,
          requiresHumanApproval: true,
          approvalReason: `Fases bloqueadas pela revisão multi-agente: ${remainingBlockedPhases.join(", ")}`,
          approvalToken: "phase-review-blocked",
        },
        multiAgentReview,
      };
    }

    this.audit.log({
      type: "execution_started",
      actor,
      projectPath,
      runId: output.runId,
      details: {
        highRiskCount: governance.highRiskCount,
        mediumRiskCount: governance.mediumRiskCount,
      },
    });

    const runRecordId = await this.engine.executeJobs(
      output.project.id,
      output.jobs,
      {
        workflow: this.buildWorkflow({ executed: true, approvalRequired: false }),
        multiAgentReview,
        governance,
        blockedPhases: remainingBlockedPhases,
        approvedPhases,
        phaseDirectives: multiAgentReview.phaseReviews.map((phase) => ({
          phase: phase.phase,
          ownerAgent: phase.ownerAgent,
          executionMode: phase.executionMode,
          verdict: phase.verdict,
          notes: phase.notes,
        })),
        sourceRunId: output.runId,
      },
      "plan" in output ? output.plan : undefined,
      "tenantId" in output ? output.tenantId : undefined
    );

    this.audit.log({
      type: "execution_completed",
      actor,
      projectPath,
      runId: runRecordId,
      details: {
        sourceRunId: output.runId,
      },
    });

    return {
      intent: "execute",
      mode: "execute",
      ...base,
      workflow: this.buildWorkflow({ executed: true, approvalRequired: false }),
      execution: {
        status: "executed",
        runRecordId,
      },
      governance,
      multiAgentReview,
    };
  }

  async handleHumanRequest(input: {
    request: string;
    path?: string;
  }): Promise<HumanRequestResponse> {
    const parsed = this.parser.parse(input.request, input.path ?? ".");
    this.audit.log({
      type: "human_request",
      actor: "api-or-cli",
      projectPath: parsed.path,
      details: {
        request: input.request,
        intent: parsed.intent,
        dryRun: parsed.dryRun,
      },
    });

    switch (parsed.intent) {
      case "scan":
        return this.scanProject(parsed.path);
      case "plan":
        return this.planProject(parsed.path);
      case "report":
        return this.reportProject(parsed.path, parsed.objective);
      case "execute":
        return this.runProject(parsed.path, !parsed.dryRun, false, [], "api-or-cli");
      default:
        return this.planProject(parsed.path);
    }
  }

  getMemorySnapshot() {
    return {
      preferences: this.memory.getAllPreferences(),
      recentProjects: this.memory.getRecentProjects(),
      decisions: this.memory.getDecisions(),
    };
  }

  updateMemoryPreference(
    key: "preferredStack" | "defaultDomain" | "codingStyle" | "autoApproveLowRisk",
    value: string | boolean
  ) {
    this.memory.setPreference(key as any, value as any);
    this.audit.log({
      type: "memory_update",
      actor: "api",
      details: { key, value },
    });
  }

  getAuditEvents(limit = 50) {
    return this.audit.list(limit);
  }

  private toBaseResponse(output: AutopilotScanOutput): MaestroBaseResponse {
    return {
      project: {
        id: output.project.id,
        name: output.project.name,
        rootPath: output.project.rootPath,
      },
      runId: output.runId,
      runDir: output.runDir,
      scan: output.scan,
      risks: output.risks,
      jobs: output.jobs.map((job) => ({
        id: job.id,
        phase: job.phase,
        taskCount: job.tasks.length,
        taskIds: job.tasks.map((task) => task.id),
      })),
      reportMarkdownPath: output.reportMarkdownPath,
      reportJsonPath: output.reportJsonPath,
      workflow: [],
    };
  }

  private buildMemorySummary() {
    const preferences = this.memory.getAllPreferences();
    const recentProjects = this.memory.getRecentProjects();
    const decisions = this.memory.getDecisions();

    return [
      preferences.codingStyle
        ? `Estilo preferido: ${preferences.codingStyle}.`
        : "Sem estilo preferido registrado.",
      recentProjects.length
        ? `Projetos recentes: ${recentProjects.join(", ")}.`
        : "Nenhum projeto recente registrado.",
      decisions.length
        ? `${decisions.length} decisoes persistidas influenciam o planejamento.`
        : "Ainda nao ha decisoes persistidas suficientes para influenciar o planejamento.",
    ].join(" ");
  }

  private buildWorkflow(input: {
    executed: boolean;
    approvalRequired: boolean;
  }): WorkflowStage[] {
    return [
      {
        code: "scan",
        status: "completed",
        note: "Estrutura do projeto analisada.",
      },
      {
        code: "plan",
        status: "completed",
        note: "Plano inicial e jobs gerados.",
      },
      {
        code: "review",
        status: "completed",
        note: "Plano revisado por ciclo multi-agente.",
      },
      {
        code: "approval",
        status: input.approvalRequired ? "blocked" : input.executed ? "completed" : "skipped",
        note: input.approvalRequired
          ? "Execucao bloqueada aguardando aprovacao humana."
          : input.executed
          ? "Aprovacao humana nao bloqueou o fluxo."
          : "Etapa de aprovacao nao foi necessaria neste fluxo.",
      },
      {
        code: "execute",
        status: input.executed ? "completed" : input.approvalRequired ? "blocked" : "pending",
        note: input.executed
          ? "Execucao concluida."
          : input.approvalRequired
          ? "Execucao parada ate override humano."
          : "Execucao ainda nao disparada.",
      },
    ];
  }
}
