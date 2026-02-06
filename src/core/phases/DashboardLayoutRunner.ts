// src/core/phases/DashboardLayoutRunner.ts

import { MaestroAction, PhaseRisk } from "../../types";
import { ProjectRegistry } from "../projects/ProjectRegistry";
import { FsWriter } from "../fs/FsWriter";

export class DashboardLayoutRunner {
  constructor(private registry: ProjectRegistry) {}

  getActions(): MaestroAction[] {
    const project = this.registry.getActiveProject();
    const fsw = new FsWriter(project.rootPath);

    return [
      {
        id: "dashboard-layout",
        name: "Criar layout admin",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          fsw.ensureDir("app/dashboard");

          fsw.writeIfMissing(
            "app/dashboard/layout.tsx",
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
        },
      },

      {
        id: "dashboard-home",
        name: "Criar home dashboard",
        type: "scaffold",
        risk: PhaseRisk.LOW,
        execute: async () => {
          fsw.writeIfMissing(
            "app/dashboard/page.tsx",
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
  }
}

