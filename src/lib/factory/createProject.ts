import { execCmd } from "@/src/lib/runner/exec";
import fs from "fs/promises";
import path from "path";

interface CreateProjectInput {
  name: string;
  basePath: string;
}

export async function createSaaSProject(input: CreateProjectInput) {
  const projectPath = path.join(input.basePath, input.name);

  // 1️⃣ Criar pasta
  await fs.mkdir(projectPath, { recursive: true });

  // 2️⃣ Criar Next App
  await execCmd("npx", [
    "create-next-app@latest",
    input.name,
    "--ts",
    "--tailwind",
    "--app",
    "--eslint",
    "--no-src-dir",
    "--import-alias",
    "@/*"
  ], { cwd: input.basePath });

  // 3️⃣ Instalar dependências padrão SaaS
  await execCmd("npm", [
    "install",
    "@prisma/client",
    "prisma",
    "next-auth",
    "bcrypt",
    "zod"
  ], { cwd: projectPath });

  return {
    success: true,
    path: projectPath
  };
}
