import fs from "fs/promises";
import path from "path";

interface StackInfo {
  framework: string | null;
  database: string | null;
  deployment: string | null;
  packageManager: string | null;
  hasEdgeFunctions: boolean;
  hasGit: boolean;
  issues: string[];
}

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function scanProject(projectPath: string): Promise<StackInfo> {
  const issues: string[] = [];

  const packageJsonPath = path.join(projectPath, "package.json");
  const hasPackageJson = await exists(packageJsonPath);

  let framework: string | null = null;
  let database: string | null = null;
  let deployment: string | null = null;
  let packageManager: string | null = null;
  let hasEdgeFunctions = false;

  if (!hasPackageJson) {
    issues.push("Missing package.json");
  } else {
    const pkgRaw = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgRaw);

    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    };

    // Framework detection
    if (deps["vite"]) framework = "vite";
    if (deps["next"]) framework = "next";
    if (deps["react"]) framework = framework ? framework + "-react" : "react";

    // Database detection
    if (await exists(path.join(projectPath, "prisma"))) {
      database = "prisma";
    }

    if (await exists(path.join(projectPath, "supabase"))) {
      database = "supabase";
    }

    if (await exists(path.join(projectPath, "schema.sql"))) {
      database = "supabase-sql";
    }

    // Deployment detection
    if (await exists(path.join(projectPath, "vercel.json"))) {
      deployment = "vercel";
    }

    // Package manager detection
    if (await exists(path.join(projectPath, "bun.lock"))) {
      packageManager = "bun";
    } else if (await exists(path.join(projectPath, "pnpm-lock.yaml"))) {
      packageManager = "pnpm";
    } else if (await exists(path.join(projectPath, "package-lock.json"))) {
      packageManager = "npm";
    }

    // Edge functions
    if (await exists(path.join(projectPath, "deno.json"))) {
      hasEdgeFunctions = true;
    }
  }

  const hasGit = await exists(path.join(projectPath, ".git"));

  if (!hasGit) issues.push("No git repository detected");

  return {
    framework,
    database,
    deployment,
    packageManager,
    hasEdgeFunctions,
    hasGit,
    issues
  };
}
