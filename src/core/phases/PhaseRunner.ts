// src/core/phases/PhaseRunner.ts

import { MaestroEngine, MaestroAction } from "../MaestroEngine";
import { ProjectRegistry } from "../projects/ProjectRegistry";
import { ShellExecutor } from "../shell/ShellExecutor";
import { GitRunner } from "../git/GitRunner";
import * as fs from "fs";
import * as path from "path";

/**
 * Converte nomes humanos em nomes seguros para npm/pastas.
 */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export class PhaseRunner {
  private readonly shell: ShellExecutor;
  private readonly git: GitRunner;
  private readonly generatedDir: string;

  constructor(
    private readonly engine: MaestroEngine,
    private readonly registry: ProjectRegistry
  ) {
    this.generatedDir = path.resolve(process.cwd(), "generated");
    this.shell = new ShellExecutor(this.generatedDir);
    this.git = new GitRunner(this.shell);
  }

  async runPhase(phase: number) {
    const project = this.registry.getActiveProject();

    if (!project) {
      throw new Error("Nenhum projeto ativo para executar fase.");
    }

    const safeName = toSlug(project.name);
    const projectDir = path.join(this.generatedDir, safeName);

    let actions: MaestroAction[] = [];

    if (phase === 0) {
      actions = [
        {
          name: "Definir visão do projeto",
          risk: "baixo",
          execute: async () => {
            console.log("🧠 Pensando: visão, público, sucesso...");
          },
        },
        {
          name: "Gerar arquitetura inicial",
          risk: "baixo",
          execute: async () => {
            console.log("🏗 Gerando arquitetura base...");
          },
        },
      ];
    }

    if (phase === 1) {
      actions = [
        {
          name: "Criar diretório do projeto",
          risk: "medio",
          execute: async () => {
            if (!fs.existsSync(projectDir)) {
              fs.mkdirSync(projectDir, { recursive: true });
              console.log(`📂 Pasta criada: ${projectDir}`);
            }
          },
        },
        {
          name: "Scaffold Next.js",
          risk: "alto",
          execute: async () => {
            console.log(`🚀 Executando create-next-app em ${safeName}...`);

            await this.shell.run(
              "npx",
              [
                "create-next-app@latest",
                ".",
                "--ts",
                "--eslint",
                "--tailwind",
                "--app",
                "--src-dir",
                "--import-alias",
                "@/*",
              ],
              {
                cwd: projectDir,
                timeoutMs: 15 * 60 * 1000,
              }
            );
          },
        },
      ];
    }

    if (!actions.length) {
      throw new Error(`Fase ${phase} ainda não implementada.`);
    }

    await this.engine.runPipeline(actions);

    // 🔥 Commit automático + captura hash
    const hash = await this.git.commitPhase(projectDir, phase);

    // 🔥 Registrar no ProjectRegistry
    this.registry.recordPhaseCommit(phase, hash);

    this.registry.updatePhase(phase);
  }
}

