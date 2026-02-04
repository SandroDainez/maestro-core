import fs from "fs";
import path from "path";
import { MaestroContext, MaestroMode, MaestroProject } from "../../../types";
import { ShellRunner } from "../../../utils/ShellRunner";

export class DashboardPhase {
  id = "dashboard";
  label = "Dashboard (Next.js + Tailwind)";

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: MaestroMode
  ): Promise<string> {
    const base = project.path;

    const created: string[] = [];

    // --------------------------------
    // 1. Create Next.js app if missing
    // --------------------------------
    const appDir = path.join(base, "web");

    if (!fs.existsSync(appDir)) {
      await ShellRunner.exec(
        "npx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --import-alias '@/*'",
        base
      );

      created.push("web/");
    }

    // --------------------------------
    // 2. Add dashboard page
    // --------------------------------
    const dashboardDir = path.join(appDir, "src/app/dashboard");

    fs.mkdirSync(dashboardDir, { recursive: true });

    const pagePath = path.join(dashboardDir, "page.tsx");

    if (!fs.existsSync(pagePath)) {
      fs.writeFileSync(
        pagePath,
        `import { supabase } from "@/lib/supabase";

export default async function DashboardPage() {
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {user ? (
        <p className="mt-4">Bem-vindo, {user.email}</p>
      ) : (
        <p className="mt-4 text-red-500">
          Usuário não autenticado.
        </p>
      )}
    </main>
  );
}
`
      );

      created.push("web/src/app/dashboard/page.tsx");
    }

    // --------------------------------
    // 3. Add layout with sidebar
    // --------------------------------
    const layoutPath = path.join(appDir, "src/app/dashboard/layout.tsx");

    if (!fs.existsSync(layoutPath)) {
      fs.writeFileSync(
        layoutPath,
        `export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h2 className="font-bold text-lg">Maestro SaaS</h2>

        <nav className="mt-6 space-y-2">
          <a href="/dashboard" className="block hover:underline">
            Dashboard
          </a>
        </nav>
      </aside>

      <section className="flex-1 bg-slate-50">
        {children}
      </section>
    </div>
  );
}
`
      );

      created.push("web/src/app/dashboard/layout.tsx");
    }

    // --------------------------------
    // 4. README append
    // --------------------------------
    const readmePath = path.join(base, "README.md");

    if (fs.existsSync(readmePath)) {
      fs.appendFileSync(
        readmePath,
        `

## 📊 Dashboard (Next.js)

Frontend criado em \`/web\`.

Rodar:

\`\`\`bash
cd web
npm run dev
\`\`\`

Acesse:

http://localhost:3000/dashboard
`
      );
    }

    return `📊 Dashboard Next.js criado (${created.length} artefatos).`;
  }
}

