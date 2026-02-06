// src/core/phases/AuthInstallRunner.ts

import { MaestroAction, PhaseRisk } from "../../types";
import { ProjectRegistry } from "../projects/ProjectRegistry";
import { FsWriter } from "../fs/FsWriter";
import { execSync } from "child_process";

export class AuthInstallRunner {
  constructor(private registry: ProjectRegistry) {}

  getActions(): MaestroAction[] {
    const project = this.registry.getActiveProject();
    const fsw = new FsWriter(project.rootPath);

    return [
      {
        id: "supabase-install",
        name: "Instalar Supabase SDK",
        type: "install",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          console.log("📦 Instalando Supabase...");

          execSync("npm install @supabase/supabase-js", {
            cwd: project.rootPath,
            stdio: "inherit",
          });
        },
      },

      {
        id: "supabase-env",
        name: "Criar .env.example",
        type: "config",
        risk: PhaseRisk.LOW,
        execute: async () => {
          fsw.writeIfMissing(
            ".env.example",
            `NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
`
          );
        },
      },

      {
        id: "supabase-client",
        name: "Criar client Supabase",
        type: "scaffold",
        risk: PhaseRisk.LOW,
        execute: async () => {
          fsw.ensureDir("src/lib");

          fsw.writeIfMissing(
            "src/lib/supabase.ts",
            `
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
`.trim()
          );
        },
      },
    ];
  }
}

