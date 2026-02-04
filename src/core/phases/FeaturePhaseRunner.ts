// src/core/phases/FeaturePhaseRunner.ts

import { MaestroEngine, MaestroAction } from "../MaestroEngine";
import { ProjectRegistry } from "../projects/ProjectRegistry";
import { ShellExecutor } from "../shell/ShellExecutor";
import { GitRunner } from "../git/GitRunner";
import * as path from "path";
import * as fs from "fs";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export class FeaturePhaseRunner {
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

  async runPhase2() {
    const project = this.registry.getActiveProject();
    if (!project) throw new Error("Nenhum projeto ativo.");

    const safeName = toSlug(project.name);
    const projectDir = path.join(this.generatedDir, safeName);

    const actions: MaestroAction[] = [
      {
        name: "Instalar Prisma",
        risk: "alto",
        execute: async () => {
          console.log("📦 Instalando Prisma...");

          await this.shell.run(
            "npm",
            ["install", "prisma", "@prisma/client"],
            { cwd: projectDir }
          );

          await this.shell.run("npx", ["prisma", "init"], {
            cwd: projectDir,
          });
        },
      },
      {
        name: "Criar schema base",
        risk: "medio",
        execute: async () => {
          const schemaPath = path.join(
            projectDir,
            "prisma",
            "schema.prisma"
          );

          const baseSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      String
  createdAt DateTime @default(now())
}
`;

          fs.writeFileSync(schemaPath, baseSchema.trim());
          console.log("🧱 schema.prisma criado.");
        },
      },
      {
        name: "Criar .env.example",
        risk: "baixo",
        execute: async () => {
          const envExample = `
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
`;

          fs.writeFileSync(
            path.join(projectDir, ".env.example"),
            envExample.trim()
          );

          console.log("📄 .env.example criado.");
        },
      },
    ];

    await this.engine.runPipeline(actions);

    const hash = await this.git.commitPhase(projectDir, 2);

    this.registry.recordPhaseCommit(2, hash);
    this.registry.updatePhase(2);
  }
}

