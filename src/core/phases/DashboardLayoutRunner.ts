// src/core/phases/DashboardLayoutRunner.ts

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

export class DashboardLayoutRunner {
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

  async runPhase7() {
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

    const dashboardDir = path.join(appDir, "dashboard");

    const actions: MaestroAction[] = [
      {
        name: "Criar layout admin com sidebar e header",
        risk: "medio",
        execute: async () => {
          fs.mkdirSync(dashboardDir, { recursive: true });

          // layout.tsx
          fs.writeFileSync(
            path.join(dashboardDir, "layout.tsx"),
            `
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-black text-white p-6">
        <h2 className="text-xl font-bold mb-6">Admin</h2>
        <nav className="space-y-3">
          <a href="/dashboard" className="block hover:underline">
            Dashboard
          </a>
          <a href="/admin" className="block hover:underline">
            Usuários
          </a>
          <a href="/dashboard/settings" className="block hover:underline">
            Configurações
          </a>
        </nav>
      </aside>

      <main className="flex-1">
        <header className="bg-white shadow px-6 py-4 flex justify-between">
          <span className="font-semibold">Painel Administrativo</span>
          <span className="text-sm text-gray-500">Logado</span>
        </header>

        <section className="p-8">{children}</section>
      </main>
    </div>
  );
}
`.trim()
          );

          // dashboard home page
          fs.writeFileSync(
            path.join(dashboardDir, "page.tsx"),
            `
export default function DashboardHome() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold">Usuários</h3>
        <p className="text-2xl mt-2">128</p>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold">Receita</h3>
        <p className="text-2xl mt-2">R$ 4.230</p>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold">Projetos</h3>
        <p className="text-2xl mt-2">42</p>
      </div>
    </div>
  );
}
`.trim()
          );
        },
      },
    ];

    await this.engine.runPipeline(actions);

    const hash = await this.git.commitPhase(projectDir, 7);

    this.registry.recordPhaseCommit(7, hash);
    this.registry.updatePhase(7);
  }
}

