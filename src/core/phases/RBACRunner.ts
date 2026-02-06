// src/core/phases/RBACRunner.ts

import fs from "fs";
import path from "path";

import { MaestroAction, PhaseRisk } from "../../types";
import { ProjectRegistry } from "../projects/ProjectRegistry";

export class RBACRunner {
  constructor(private registry: ProjectRegistry) {}

  getActions(): MaestroAction[] {
    const projectPath = this.registry.getActiveProject().rootPath;

    const srcDir = fs.existsSync(path.join(projectPath, "src"))
      ? path.join(projectPath, "src")
      : projectPath;

    const appDir = fs.existsSync(path.join(srcDir, "app"))
      ? path.join(srcDir, "app")
      : path.join(projectPath, "app");

    return [
      // ============================
      // RBAC helper
      // ============================
      {
        id: "rbac-helper",
        name: "Criar helper RBAC",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          const libDir = path.join(srcDir, "lib");
          fs.mkdirSync(libDir, { recursive: true });

          const filePath = path.join(libDir, "rbac.ts");

          if (fs.existsSync(filePath)) {
            console.log("⏭️  skip (exists) src/lib/rbac.ts");
            return;
          }

          const content = `
export function requireRole(role: string) {
  return function middleware() {
    // placeholder — integrar com auth real
    console.log("Checking role:", role);
  };
}
`.trim();

          fs.writeFileSync(filePath, content);
          console.log("📝 write src/lib/rbac.ts");
        },
      },

      // ============================
      // Middleware global
      // ============================
      {
        id: "rbac-middleware",
        name: "Criar middleware RBAC",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          const middlewarePath = path.join(projectPath, "middleware.ts");

          if (fs.existsSync(middlewarePath)) {
            console.log("⏭️  skip (exists) middleware.ts");
            return;
          }

          const content = `
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const loggedIn = true; // placeholder

  if (!loggedIn && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
`.trim();

          fs.writeFileSync(middlewarePath, content);
          console.log("📝 write middleware.ts");
        },
      },

      // ============================
      // Dashboard page
      // ============================
      {
        id: "rbac-dashboard",
        name: "Criar página dashboard protegida",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          const dashDir = path.join(appDir, "dashboard");
          fs.mkdirSync(dashDir, { recursive: true });

          const pagePath = path.join(dashDir, "page.tsx");

          if (fs.existsSync(pagePath)) {
            console.log("⏭️  skip (exists) app/dashboard/page.tsx");
            return;
          }

          const content = `
export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Área protegida por RBAC.</p>
    </div>
  );
}
`.trim();

          fs.writeFileSync(pagePath, content);
          console.log("📝 write app/dashboard/page.tsx");
        },
      },

      // ============================
      // Admin page
      // ============================
      {
        id: "rbac-admin",
        name: "Criar página admin",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          const adminDir = path.join(appDir, "admin");
          fs.mkdirSync(adminDir, { recursive: true });

          const pagePath = path.join(adminDir, "page.tsx");

          if (fs.existsSync(pagePath)) {
            console.log("⏭️  skip (exists) app/admin/page.tsx");
            return;
          }

          const content = `
export default function AdminPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p>Somente administradores.</p>
    </div>
  );
}
`.trim();

          fs.writeFileSync(pagePath, content);
          console.log("📝 write app/admin/page.tsx");
        },
      },
    ];
  }
}

