// src/core/planner/SaaSPlanner.ts

import {
  MaestroJob,
  MaestroTask,
  MaestroAction,
  AutopilotScanResult,
  AutopilotRisk,
  TaskStatus,
  PhaseRisk,
} from "../../types";

import { FeaturePhaseRunner } from "../phases/FeaturePhaseRunner";
import { AuthPhaseRunner } from "../phases/AuthPhaseRunner";
import { AuthInstallRunner } from "../phases/AuthInstallRunner";
import { RBACRunner } from "../phases/RBACRunner";
import { SeedRunner } from "../phases/SeedRunner";
import { DashboardLayoutRunner } from "../phases/DashboardLayoutRunner";
import { PhaseRunner } from "../phases/PhaseRunner";

import { ProjectRegistry } from "../projects/ProjectRegistry";
import type { MaestroPreferences } from "../memory/MemoryManager";

export type PlannerMemoryContext = {
  preferences: MaestroPreferences;
  recentProjects: string[];
  recentDecisions: string[];
};

/**
 * SaaSPlanner
 *
 * Converte scan + riscos em MaestroJobs
 * usando o ProjectRegistry da engine.
 */
export class SaaSPlanner {
  constructor(private registry: ProjectRegistry) {}

  plan(
    scan: AutopilotScanResult,
    risks: AutopilotRisk[],
    memory?: PlannerMemoryContext
  ): MaestroJob[] {
    const jobs: MaestroJob[] = [];

    // ============================
    // INIT
    // ============================

    const base = new PhaseRunner();
    jobs.push(this.buildJob("init", base.getActions()));

    // ============================
    // FEATURE / PRISMA
    // ============================

    if (!scan.hasPrisma) {
      const feature = new FeaturePhaseRunner(this.registry);
      jobs.push(this.buildJob("feature", feature.getActions()));
    }

    // ============================
    // AUTH
    // ============================

    const authInstall = new AuthInstallRunner(this.registry);
    const authPhase = new AuthPhaseRunner(this.registry);

    jobs.push(
      this.buildJob("auth-install", authInstall.getActions()),
      this.buildJob("auth-config", authPhase.getActions())
    );

    // ============================
    // DASHBOARD
    // ============================

    const dashboard = new DashboardLayoutRunner(this.registry);
    jobs.push(this.buildJob("dashboard", dashboard.getActions()));

    // ============================
    // RBAC
    // ============================

    const rbac = new RBACRunner(this.registry);
    jobs.push(this.buildJob("rbac", rbac.getActions()));

    // ============================
    // SEED
    // ============================

    const seed = new SeedRunner(); // 🚨 SEM registry
    jobs.push(this.buildJob("seed", seed.getActions()));

    if (this.shouldScheduleGovernanceReview(risks, memory)) {
      jobs.push(
        this.buildAdvisoryJob("governance-review", [
          "Revisar riscos altos e checkpoints humanos antes da execução",
          "Validar aderência às decisões persistidas na memória do Maestro",
        ])
      );
    }

    if (this.shouldScheduleArchitectureReview(memory)) {
      jobs.push(
        this.buildAdvisoryJob("architecture-review", [
          "Revisar padrões arquiteturais usados recentemente",
          "Padronizar estrutura antes de ampliar novas features",
        ])
      );
    }

    // remove jobs vazios
    return jobs.filter((j) => j.tasks.length > 0);
  }

  // ============================
  // HELPERS
  // ============================

  private buildJob(
    phase: string,
    actions: MaestroAction[]
  ): MaestroJob {
    const tasks: MaestroTask[] = actions.map((a) => ({
      id: `${phase}:${a.id}`,
      action: a,
      status: TaskStatus.PENDING,
    }));

    return {
      id: phase,
      phase,
      tasks,
    };
  }

  private buildAdvisoryJob(phase: string, tasksText: string[]): MaestroJob {
    const tasks: MaestroTask[] = tasksText.map((description, index) => ({
      id: `${phase}:advice-${index + 1}`,
      status: TaskStatus.PENDING,
      action: {
        id: `${phase}-advice-${index + 1}`,
        name: description,
        type: "advisory",
        risk: PhaseRisk.LOW,
        execute: async () => {},
      },
    }));

    return {
      id: phase,
      phase,
      tasks,
    };
  }

  private shouldScheduleGovernanceReview(
    risks: AutopilotRisk[],
    memory?: PlannerMemoryContext
  ) {
    const hasHighRisk = risks.some((risk) => risk.risk === PhaseRisk.HIGH);
    const prefersEnterprise = memory?.preferences?.codingStyle === "enterprise";
    const remembersApproval = memory?.recentDecisions.some((decision) =>
      decision.toLowerCase().includes("approved=")
    );

    return hasHighRisk || prefersEnterprise || Boolean(remembersApproval);
  }

  private shouldScheduleArchitectureReview(memory?: PlannerMemoryContext) {
    if (!memory) return false;

    const recentProjectCount = memory.recentProjects.length;
    const strictStyle = memory.preferences.codingStyle === "strict";
    const prefersDefaultDomain = Boolean(memory.preferences.defaultDomain);

    return strictStyle || prefersDefaultDomain || recentProjectCount >= 3;
  }
}
