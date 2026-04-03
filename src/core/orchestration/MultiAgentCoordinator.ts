import type { MaestroJob, AutopilotRisk } from "../../types";
import { AgentRegistry } from "../../agents/AgentRegistry";
import { ArchitectureAgent } from "../../agents/ArchitectureAgent";
import { DeveloperAgent } from "../../agents/DeveloperAgent";
import { FallbackAgent } from "../../agents/FallbackAgent";
import { GovernanceAgent } from "../../agents/GovernanceAgent";
import { ReviewerAgent } from "../../agents/ReviewerAgent";

export type MultiAgentReview = {
  participants: string[];
  summary: string;
  recommendations: string[];
  flaggedPhases: string[];
  phaseReviews: Array<{
    phase: string;
    agents: string[];
    ownerAgent: string;
    executionMode:
      | "standard"
      | "architecture_guarded"
      | "governance_guarded"
      | "advisory_only";
    verdict: "ok" | "attention" | "blocked";
    notes: string[];
  }>;
};

export class MultiAgentCoordinator {
  private registry = new AgentRegistry();

  constructor() {
    this.registry.register(new ArchitectureAgent());
    this.registry.register(new DeveloperAgent());
    this.registry.register(new GovernanceAgent());
    this.registry.register(new ReviewerAgent());
    this.registry.register(new FallbackAgent());
  }

  reviewPlan(input: {
    jobs: MaestroJob[];
    risks: AutopilotRisk[];
    objective?: string;
    recentDecisions?: string[];
  }): MultiAgentReview {
    const participants = new Set<string>(["Reviewer", "Maestro-Orchestrator"]);
    const recommendations: string[] = [];
    const flaggedPhases: string[] = [];
    const phaseReviews: MultiAgentReview["phaseReviews"] = [];

    const hasHighRisk = input.risks.some((risk) => risk.risk === "HIGH");
    const architecturePhases = input.jobs
      .filter((job) =>
        ["architecture-review", "dashboard", "rbac", "auth-config", "auth-install"].includes(job.phase)
      )
      .map((job) => job.phase);
    const governancePhases = input.jobs
      .filter((job) =>
        ["governance-review"].includes(job.phase) ||
        job.phase.includes("governance")
      )
      .map((job) => job.phase);

    for (const job of input.jobs) {
      const matchingAgents = this.registry.findAllForTask(job.phase);
      for (const agent of matchingAgents) {
        participants.add(agent.name);
      }

      const reviewAgents = matchingAgents.map((agent) => agent.name);
      const notes: string[] = [];
      let verdict: "ok" | "attention" | "blocked" = "ok";
      let ownerAgent = reviewAgents[0] ?? "Maestro-Orchestrator";
      let executionMode: MultiAgentReview["phaseReviews"][number]["executionMode"] =
        "standard";

      if (job.phase.includes("governance") || job.phase.includes("architecture")) {
        notes.push("Fase exige revisão explícita antes da execução.");
        verdict = "attention";
      }

      if (hasHighRisk && (job.phase === "init" || job.phase.includes("governance"))) {
        notes.push("Risco alto associado ao plano exige aprovação humana.");
        verdict = "blocked";
      }

      if (reviewAgents.includes("Architecture")) {
        ownerAgent = "Architecture";
        executionMode = "architecture_guarded";
        notes.push("Arquitetura recomenda validar acoplamento e fronteiras da fase.");
      }

      if (reviewAgents.includes("Governance")) {
        ownerAgent = "Governance";
        executionMode = "governance_guarded";
        notes.push("Governança recomenda validar trilha de auditoria e policy gate.");
      }

      if (
        job.phase.includes("review") &&
        !reviewAgents.includes("Governance") &&
        !reviewAgents.includes("Architecture")
      ) {
        executionMode = "advisory_only";
      }

      if (notes.length === 0) {
        notes.push("Fase consistente para execução incremental.");
      }

      phaseReviews.push({
        phase: job.phase,
        agents: reviewAgents.length ? reviewAgents : ["Maestro-Orchestrator"],
        ownerAgent,
        executionMode,
        verdict,
        notes,
      });
    }

    if (architecturePhases.length > 0) {
      recommendations.push(
        "O agente de arquitetura recomenda consolidar auth, RBAC e dashboard antes de ampliar novas capacidades."
      );
      flaggedPhases.push(...architecturePhases);
    }

    if (hasHighRisk) {
      recommendations.push(
        "O agente de governança recomenda checkpoint humano antes das fases com risco alto."
      );
      flaggedPhases.push(...input.jobs.slice(0, 2).map((job) => job.phase));
    }

    if (governancePhases.length === 0) {
      recommendations.push(
        "Incluir uma revisão explícita de arquitetura e governança no plano."
      );
    } else {
      recommendations.push(
        "Manter as fases de revisão de arquitetura e governança antes da execução."
      );
      flaggedPhases.push(...governancePhases);
    }

    if ((input.recentDecisions?.length ?? 0) > 0) {
      recommendations.push(
        "Reutilizar decisões recentes persistidas para reduzir variação de implementação."
      );
    }

    if (input.objective) {
      recommendations.push(
        `Garantir que o plano permaneça alinhado ao objetivo declarado: "${input.objective}".`
      );
    }

    const summary = hasHighRisk
      ? "O plano foi revisado por múltiplos agentes e exige cautela antes da execução."
      : "O plano foi revisado por múltiplos agentes e está consistente para evolução incremental.";

    return {
      participants: Array.from(participants),
      summary,
      recommendations: Array.from(new Set(recommendations)),
      flaggedPhases: Array.from(new Set(flaggedPhases)),
      phaseReviews,
    };
  }
}
