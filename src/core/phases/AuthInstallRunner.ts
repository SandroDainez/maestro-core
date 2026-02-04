// src/core/phases/AuthInstallRunner.ts

import { MaestroEngine, MaestroAction } from "../MaestroEngine";
import { ProjectRegistry } from "../projects/ProjectRegistry";
import { ShellExecutor } from "../shell/ShellExecutor";
import { GitRunner } from "../git/GitRunner";
import * as path from "path";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export class AuthInstallRunner {
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

  async runPhase4() {
    const project = this.registry.getActiveProject();
    if (!project) throw new Error("Nenhum projeto ativo.");

    const safeName = toSlug(project.name);
    const projectDir = path.join(this.generatedDir, safeName);

    const actions: MaestroAction[] = [
      {
        name: "Instalar Auth.js e deps",
        risk: "alto",
        execute: async () => {
          await this.shell.run(
            "npm",
            [
              "install",
              "next-auth",
              "@auth/prisma-adapter",
              "bcrypt",
            ],
            { cwd: projectDir }
          );
        },
      },
    ];

    await this.engine.runPipeline(actions);

    const hash = await this.git.commitPhase(projectDir, 4);

    this.registry.recordPhaseCommit(4, hash);
    this.registry.updatePhase(4);
  }
}

