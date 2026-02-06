// src/core/planner/SaaSPlanner.ts

import {
  MaestroJob,
  MaestroTask,
  MaestroAction,
  AutopilotScanResult,
  AutopilotRisk,
  TaskStatus,
} from "../../types";

import { FeaturePhaseRunner } from "../phases/FeaturePhaseRunner";
import { AuthPhaseRunner } from "../phases/AuthPhaseRunner";
import { AuthInstallRunner } from "../phases/AuthInstallRunner";
import { RBACRunner } from "../phases/RBACRunner";
import { SeedRunner } from "../phases/SeedRunner";
import { DashboardLayoutRunner } from "../phases/DashboardLayoutRunner";
import { PhaseRunner } from "../phases/PhaseRunner";

import { ProjectRegistry } from "../projects/ProjectRegistry";

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
    risks: AutopilotRisk[]
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
}

