// src/core/MaestroEngine.ts

import path from "path";

import {
  MaestroJob,
  AutopilotScanOutput,
  MaestroMode,
  MaestroProject,
} from "../types";

import { ensureDir } from "../utils/fsx";

import { AutopilotScanner } from "../autopilot/AutopilotScanner";
import { RiskEngine } from "../autopilot/RiskEngine";
import { ReportGenerator } from "../autopilot/ReportGenerator";
import { RiskGate } from "../autopilot/RiskGate";
import { PreviewEngine } from "../autopilot/PreviewEngine";

import { SaaSPlanner } from "./planner/SaaSPlanner";
import { TaskQueue } from "../pipelines/TaskQueue";
import { ProjectRegistry } from "./projects/ProjectRegistry";

import { TenantRepository } from "../db/tenant.repository";
import { ProjectRepository } from "../db/project.repository";
import { RunRepository } from "../db/repositories/run.repo";
import { PhaseRunRepository } from "../db/phase-run.repository";

export class MaestroEngine {
  private registry = new ProjectRegistry();
  private queue = new TaskQueue();

  private tenantRepo = new TenantRepository();
  private projectRepo = new ProjectRepository();
  private runRepo = new RunRepository();
  private phaseRunRepo = new PhaseRunRepository();

  private scanner = new AutopilotScanner();
  private riskEngine = new RiskEngine();
  private reporter = new ReportGenerator();
  private planner = new SaaSPlanner(this.registry);

  private gate = new RiskGate();
  private preview = new PreviewEngine();

  // ======================================
  // AUTOPILOT SCAN
  // ======================================

  async autopilotScan(
    projectPath: string,
    mode: MaestroMode = MaestroMode.PLAN
  ): Promise<AutopilotScanOutput> {
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
    const jobs: MaestroJob[] = this.planner.plan(scan, risks);

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

    return output;
  }

  // ======================================
  // EXECUTAR JOBS
  // ======================================

  async executeJobs(projectId: string, jobs: MaestroJob[]) {
    const run = await this.runRepo.create(projectId);

    for (const job of jobs) {
      console.log(`▶️ Executando fase: ${job.phase}`);

      const phaseRun = await this.phaseRunRepo.create(run.id, job.phase);

      await this.queue.run(job.tasks);

      await this.phaseRunRepo.finish(phaseRun.id, "success");
    }

    await this.runRepo.finish(run.id, "success");

    return run.id;
  }
}

