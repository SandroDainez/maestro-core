// src/core/phases/AuthPhaseRunner.ts

import { MaestroEngine, MaestroAction } from "../MaestroEngine";
import { ProjectRegistry } from "../projects/ProjectRegistry";
import * as fs from "fs";
import * as path from "path";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export class AuthPhaseRunner {
  constructor(
    private readonly engine: MaestroEngine,
    private readonly registry: ProjectRegistry
  ) {}

  async runPhase3() {
    const project = this.registry.getActiveProject();

    if (!project) {
      throw new Error("Nenhum projeto ativo.");
    }

    const safe = toSlug(project.name);

    const projectDir = path.resolve(
      process.cwd(),
      "generated",
      safe,
      "web"
    );

    console.log("🔐 Instalando Supabase Auth em:", projectDir);

    if (!fs.existsSync(projectDir)) {
      throw new Error("Projeto web não encontrado. Rode scaffold/dashboard antes.");
    }

    const actions: MaestroAction[] = [
      {
        name: "Instalar Supabase SDK",
        risk: "medio",
        execute: async () => {
          const { execSync } = await import("child_process");

          execSync("npm install @supabase/supabase-js", {
            cwd: projectDir,
            stdio: "inherit",
          });
        },
      },

      {
        name: "Criar .env.example",
        risk: "baixo",
        execute: async () => {
          fs.writeFileSync(
            path.join(projectDir, ".env.example"),
            `NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
`
          );
        },
      },

      {
        name: "Criar client Supabase",
        risk: "baixo",
        execute: async () => {
          const libDir = path.join(projectDir, "src/lib");

          fs.mkdirSync(libDir, { recursive: true });

          fs.writeFileSync(
            path.join(libDir, "supabase.ts"),
            `
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
`
          );
        },
      },

      {
        name: "Criar middleware auth",
        risk: "medio",
        execute: async () => {
          fs.writeFileSync(
            path.join(projectDir, "middleware.ts"),
            `
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const loggedIn = false;

  if (!loggedIn && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}
`
          );
        },
      },

      {
        name: "Criar página login",
        risk: "baixo",
        execute: async () => {
          const loginDir = path.join(
            projectDir,
            "src/app/login"
          );

          fs.mkdirSync(loginDir, { recursive: true });

          fs.writeFileSync(
            path.join(loginDir, "page.tsx"),
            `
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  const login = async () => {
    await supabase.auth.signInWithOtp({ email });
    alert("Confira seu email!");
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="p-6 border rounded w-80">
        <h1 className="text-xl mb-4">Login</h1>
        <input
          className="border p-2 w-full mb-3"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="bg-black text-white px-4 py-2 w-full"
          onClick={login}
        >
          Entrar
        </button>
      </div>
    </main>
  );
}
`
          );
        },
      },
    ];

    await this.engine.runPipeline(actions);

    console.log("✅ AuthPhase COMPLETA — Supabase instalado.");
  }
}

