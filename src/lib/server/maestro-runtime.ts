import fs from "fs";
import os from "os";
import path from "path";

import { MaestroEngine } from "@/src/core/MaestroEngine";

const globalForMaestro = globalThis as typeof globalThis & {
  __maestroEngine?: MaestroEngine;
  __maestroWorkspace?: string;
  __maestroWorkspaceStamp?: string;
};

const EXCLUDED_TOP_LEVEL = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "maestro-runs",
  "agent-executions",
  "logs",
  "coverage",
  ".vercel",
  ".turbo",
]);

function copyProjectSnapshot(sourceDir: string, targetDir: string) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (EXCLUDED_TOP_LEVEL.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    fs.cpSync(sourcePath, targetPath, {
      recursive: true,
      force: true,
    });
  }
}

function getWorkspaceStamp(sourceDir: string) {
  const sourcePackageJson = path.join(sourceDir, "package.json");
  const packageJsonStat = fs.statSync(sourcePackageJson);

  return [
    process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    packageJsonStat.mtimeMs,
  ].join(":");
}

export function getMaestroEngine() {
  if (!globalForMaestro.__maestroEngine) {
    globalForMaestro.__maestroEngine = new MaestroEngine();
  }

  return globalForMaestro.__maestroEngine;
}

export function getWritableWorkspace(sourceDir = process.cwd()) {
  const workspaceDir = path.join(os.tmpdir(), "maestro-app-workspace");
  const currentStamp = getWorkspaceStamp(sourceDir);
  const manifestPath = path.join(workspaceDir, ".maestro-workspace.json");

  let cachedStamp = globalForMaestro.__maestroWorkspaceStamp;

  if (!cachedStamp && fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
        stamp?: string;
      };
      cachedStamp = manifest.stamp;
    } catch {
      cachedStamp = undefined;
    }
  }

  if (
    !globalForMaestro.__maestroWorkspace ||
    !fs.existsSync(path.join(workspaceDir, "package.json")) ||
    cachedStamp !== currentStamp
  ) {
    copyProjectSnapshot(sourceDir, workspaceDir);
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({ stamp: currentStamp }, null, 2),
      "utf-8"
    );
    globalForMaestro.__maestroWorkspace = workspaceDir;
    globalForMaestro.__maestroWorkspaceStamp = currentStamp;
  }

  return globalForMaestro.__maestroWorkspace;
}
