// src/core/phases/SeedRunner.ts

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

export class SeedRunner {
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

  async runPhase8() {
    const project = this.registry.getActiveProject();
    if (!project) throw new Error("Nenhum projeto ativo.");

    const safeName = toSlug(project.name);
    const projectDir = path.join(this.generatedDir, safeName);

    const prismaDir = path.join(projectDir, "prisma");
    fs.mkdirSync(prismaDir, { recursive: true });

    const seedFile = path.join(prismaDir, "seed.ts");

    const actions: MaestroAction[] = [
      {
        name: "Criar seed Prisma",
        risk: "medio",
        execute: async () => {
          fs.writeFileSync(
            seedFile,
            `
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Rodando seed...");

  const tenant = await prisma.tenant.upsert({
    where: { name: "Default" },
    update: {},
    create: {
      name: "Default",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      password: "admin123",
      role: "admin",
    },
  });

  console.log("✅ Tenant:", tenant.id);
  console.log("✅ Admin:", admin.email);

  await prisma.user.createMany({
    data: Array.from({ length: 15 }).map((_, i) => ({
      email: \`user\${i + 1}@demo.com\`,
      password: "123456",
      role: "user",
    })),
    skipDuplicates: true,
  });

  console.log("🎉 Seed finalizado!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`.trim()
          );
        },
      },
    ];

    await this.engine.runPipeline(actions);

    const hash = await this.git.commitPhase(projectDir, 8);

    this.registry.recordPhaseCommit(8, hash);
    this.registry.updatePhase(8);
  }
}

