// src/core/phases/AuthConfigRunner.ts

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

export class AuthConfigRunner {
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

  async runPhase5() {
    const project = this.registry.getActiveProject();
    if (!project) throw new Error("Nenhum projeto ativo.");

    const safeName = toSlug(project.name);
    const projectDir = path.join(this.generatedDir, safeName);

    const srcDir = path.join(projectDir, "src");
    const appDir = path.join(srcDir, "app");

    const actions: MaestroAction[] = [
      {
        name: "Criar auth config, middleware e páginas",
        risk: "medio",
        execute: async () => {
          fs.mkdirSync(path.join(srcDir, "lib"), { recursive: true });
          fs.mkdirSync(path.join(appDir, "api", "auth", "[...nextauth]"), {
            recursive: true,
          });
          fs.mkdirSync(path.join(appDir, "login"), { recursive: true });
          fs.mkdirSync(path.join(appDir, "register"), { recursive: true });

          // auth.ts
          fs.writeFileSync(
            path.join(srcDir, "lib", "auth.ts"),
            `
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!valid) return null;

        return user;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
};
`.trim()
          );

          // NextAuth route
          fs.writeFileSync(
            path.join(appDir, "api", "auth", "[...nextauth]", "route.ts"),
            `
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
`.trim()
          );

          // middleware
          fs.writeFileSync(
            path.join(projectDir, "middleware.ts"),
            `
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*"],
};
`.trim()
          );

          // login page
          fs.writeFileSync(
            path.join(appDir, "login", "page.tsx"),
            `
"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={() =>
          signIn("credentials", {
            email: "admin@demo.com",
            password: "admin123",
          })
        }
        className="rounded bg-black px-4 py-2 text-white"
      >
        Entrar
      </button>
    </div>
  );
}
`.trim()
          );

          // register page (placeholder)
          fs.writeFileSync(
            path.join(appDir, "register", "page.tsx"),
            `
export default function RegisterPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Registro</h1>
      <p>Implementar formulário aqui.</p>
    </div>
  );
}
`.trim()
          );
        },
      },
    ];

    await this.engine.runPipeline(actions);

    const hash = await this.git.commitPhase(projectDir, 5);

    this.registry.recordPhaseCommit(5, hash);
    this.registry.updatePhase(5);
  }
}

