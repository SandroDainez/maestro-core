// src/core/MaestroEngine.ts

import { PhaseRegistry } from "./phases/PhaseRegistry";
import { registerPhases } from "./phases/registerPhases";

import { RunRepository } from "../db/run.repository";
import { ProjectRepository } from "../db/project.repository";

import { GitManager } from "./git/GitManager";
import { StateManager, RunState } from "./state/StateManager";

import { MaestroContext, MaestroProject } from "../types";

export class MaestroEngine {
  private static instance: MaestroEngine;

  static getInstance() {
    if (!this.instance) {
      this.instance = new MaestroEngine();
    }
    return this.instance;
  }

  private constructor() {
    registerPhases();
  }

  // ==================================================
  // LOAD PROJECT
  // ==================================================
  private async loadProject(): Promise<MaestroProject> {
    // 👉 método REAL do seu repository
    const dbProject = await ProjectRepository.getActive();

    if (!dbProject) {
      throw new Error("Nenhum projeto ativo encontrado.");
    }

    return {
      id: dbProject.id,
      name: dbProject.name,
      slug: dbProject.slug,
      rootDir: dbProject.path,
      currentPhase: 0,
      commits: [],
    };
  }

  // ==================================================
  // START PIPELINE
  // ==================================================
  async startPipeline(phases: string[]) {
    const project = await this.loadProject();

    const run = await RunRepository.create(project.id, phases);

    await RunRepository.startRun(run.id);

    const branch = `run/${run.id}`;

    GitManager.createRunBranch(project.rootDir, run.id);

    const state: RunState = {
      id: run.id,
      projectId: project.id,
      branch,
      phases,
      currentPhase: 0,
      createdAt: new Date().toISOString(),
      finishedAt: null,
    };

    StateManager.writeRun(project.rootDir, state);

    await this.executePhases(project, state, "run");
  }

  // ==================================================
  // RESUME
  // ==================================================
  async resumePipeline() {
    const project = await this.loadProject();

    const state = StateManager.readRun(project.rootDir);

    if (!state) {
      console.log("ℹ️ Nenhum run pendente.");
      return;
    }

    // 👉 método correto
    GitManager.checkout(project.rootDir, state.branch);

    await RunRepository.resetRun(state.id);

    await this.executePhases(project, state, "resume");
  }

  // ==================================================
  // RETRY PHASE
  // ==================================================
  async retryPhase(phase: string) {
    const project = await this.loadProject();

    const state = StateManager.readRun(project.rootDir);

    if (!state) {
      console.log("ℹ️ Nenhum run ativo.");
      return;
    }

    const idx = state.phases.indexOf(phase);

    if (idx === -1) {
      console.log(`⚠️ Fase não encontrada: ${phase}`);
      return;
    }

    state.currentPhase = idx;

    StateManager.writeRun(project.rootDir, state);

    GitManager.checkout(project.rootDir, state.branch);

    await RunRepository.resetPhase(state.id, phase);

    await this.executePhases(project, state, "retry");
  }

  // ==================================================
  // CORE EXECUTOR
  // ==================================================
  private async executePhases(
    project: MaestroProject,
    state: RunState,
    mode: "run" | "resume" | "retry"
  ) {
    for (let i = state.currentPhase; i < state.phases.length; i++) {
      const name = state.phases[i];

      const phase = PhaseRegistry.get(name);

      if (!phase) {
        console.log(`❌ Fase não registrada: ${name}`);
        await RunRepository.finishRun(state.id, "failed");
        return;
      }

      console.log(`▶️ Executando fase: ${name}`);

      state.currentPhase = i;
      StateManager.writeRun(project.rootDir, state);

      await RunRepository.startPhase(state.id, name);

      const ctx: MaestroContext = {
        runId: state.id,
        mode,
      };

      try {
        const result = await phase.run(project, ctx, mode);

        if (!result.success) {
          console.log(`❌ Falha: ${result.message ?? name}`);

          await RunRepository.finishPhase(
            state.id,
            name,
            "failed",
            result.message
          );

          await RunRepository.finishRun(state.id, "failed");
          return;
        }

        await RunRepository.finishPhase(state.id, name, "success");

      } catch (err: any) {
        console.error(`💥 Erro na fase ${name}:`, err.message);

        await RunRepository.finishPhase(
          state.id,
          name,
          "failed",
          err.message
        );

        await RunRepository.finishRun(state.id, "failed");
        return;
      }
    }

    state.finishedAt = new Date().toISOString();
    StateManager.writeRun(project.rootDir, state);

    StateManager.clear(project.rootDir);

    await RunRepository.finishRun(state.id, "success");

    console.log("✅ Pipeline finalizado.");
  }

  // ==================================================
  // STATUS
  // ==================================================
  async printStatus() {
    const project = await this.loadProject();

    const latest = await RunRepository.latestRun(project.id);

    if (!latest) {
      console.log("ℹ️ Nenhum run encontrado.");
      return;
    }

    console.log(`📦 Projeto: ${project.name}`);
    console.log(`🆔 Último run: ${latest.id}`);
    console.log(`📊 Status: ${latest.status}`);

    for (const phase of latest.phases) {
      console.log(` • ${phase.name} — ${phase.status}`);
    }
  }

  // ==================================================
  // HISTORY
  // ==================================================
  async printHistory() {
    const project = await this.loadProject();

    const runs = await RunRepository.runsForProject(project.id);

    if (!runs.length) {
      console.log("ℹ️ Nenhum histórico.");
      return;
    }

    console.log("📜 Histórico:");

    for (const run of runs) {
      console.log(`Run ${run.id} — ${run.status}`);

      for (const phase of run.phases) {
        console.log(`   • ${phase.name} — ${phase.status}`);
      }
    }
  }
}

