// src/core/phases/RBACRunner.ts

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

export class RBACRunner {
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

  async runPhase6() {
    const project = this.registry.getActiveProject();
    if (!project) throw new Error("Nenhum projeto ativo.");

    const safeName = toSlug(project.name);
    const projectDir = path.join(this.generatedDir, safeName);

    const srcDir = fs.existsSync(path.join(projectDir, "src"))
      ? path.join(projectDir, "src")
      : projectDir;

    const appDir = fs.existsSync(path.join(srcDir, "app"))
      ? path.join(srcDir, "app")
      : path.join(projectDir, "app");

    const actions: MaestroAction[] = [
      {
        name: "Criar helpers RBAC",
        risk: "medio",
        execute: async () => {
          fs.mkdirSync(path.join(srcDir, "lib"), { recursive: true });

          fs.writeFileSync(
            path.join(srcDir, "lib", "rbac.ts"),
            `
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function requireRole(role: string) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== role) {
    throw new Error("Acesso negado");
  }

  return session;
}
`.trim()
          );
        },
      },

      {
        name: "Criar páginas protegidas",
        risk: "medio",
        execute: async () => {
          fs.mkdirSync(path.join(appDir, "dashboard"), { recursive: true });
          fs.mkdirSync(path.join(appDir, "admin"), { recursive: true });

          fs.writeFileSync(
            path.join(appDir, "dashboard", "page.tsx"),
            `
import { requireRole } from "@/lib/rbac";

export default async function DashboardPage() {
  await requireRole("user");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Área protegida.</p>
    </div>
  );
}
`.trim()
          );

          fs.writeFileSync(
            path.join(appDir, "admin", "page.tsx"),
            `
import { requireRole } from "@/lib/rbac";

export default async function AdminPage() {
  await requireRole("admin");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p>Somente administradores.</p>
    </div>
  );
}
`.trim()
          );
        },
      },
    ];

    await this.engine.runPipeline(actions);

    const hash = await this.git.commitPhase(projectDir, 6);

    this.registry.recordPhaseCommit(6, hash);
    this.registry.updatePhase(6);
  }
}

