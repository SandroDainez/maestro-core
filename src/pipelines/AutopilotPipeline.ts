// src/pipelines/AutopilotPipeline.ts

import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  AutopilotScanOutput,
  AutopilotRisk,
  MaestroJob,
  MaestroProject,
  PhaseRisk,
  DetectedStack,
} from "../types";

export class AutopilotPipeline {
  constructor(private projectPath: string) {}

  // ============================
  // PROJECT FACTORY
  // ============================

  private createProject(): MaestroProject {
    return {
      id: crypto.randomUUID(),
      name: path.basename(this.projectPath),
      rootPath: this.projectPath,
      currentPhase: "scan",
      createdAt: new Date(),
    };
  }

  // ============================
  // MAIN SCAN
  // ============================

  scan(): AutopilotScanOutput {
    const project = this.createProject();

    const pkgPath = path.join(this.projectPath, "package.json");

    const stack: DetectedStack[] = [];
    const scripts: string[] = [];
    const risks: AutopilotRisk[] = [];
    const jobs: MaestroJob[] = [];

    // ----------------------------
    // PACKAGE.JSON
    // ----------------------------

    if (!fs.existsSync(pkgPath)) {
      risks.push({
        id: "missing-package",
        risk: PhaseRisk.HIGH,
        title: "package.json ausente",
        detail: "Projeto não parece Node.js",
      });
    } else {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

      scripts.push(...Object.keys(pkg.scripts || {}));

      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      if (deps.next) stack.push("next");
      if (deps.react) stack.push("react");
      if (deps.prisma) stack.push("prisma");
      if (deps["@supabase/supabase-js"]) stack.push("supabase");
    }

    // ----------------------------
    // TYPESCRIPT
    // ----------------------------

    if (fs.existsSync(path.join(this.projectPath, "tsconfig.json"))) {
      stack.push("typescript");
    }

    // ----------------------------
    // JOB PLANNER (BÁSICO)
    // ----------------------------

    if (!stack.includes("prisma")) {
      jobs.push({
        id: "init",
        phase: "init",
        tasks: [],
      });
    }

    if (!stack.includes("supabase")) {
      jobs.push({
        id: "auth-install",
        phase: "auth",
        tasks: [],
      });
    }

    if (!fs.existsSync(path.join(this.projectPath, "app"))) {
      jobs.push({
        id: "dashboard",
        phase: "dashboard",
        tasks: [],
      });
    }

    // ----------------------------
    // RUN DIRECTORY
    // ----------------------------

    const runId = `run-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}`;

    const runDir = path.join(process.cwd(), "maestro-runs", runId);

    fs.mkdirSync(runDir, { recursive: true });

    const reportJsonPath = path.join(runDir, "run.json");
    const reportMarkdownPath = path.join(runDir, "plan.md");

    // ----------------------------
    // OUTPUT OBJECT
    // ----------------------------

    const output: AutopilotScanOutput = {
      project,
      scan: {
        hasNext: stack.includes("next"),
        hasPrisma: stack.includes("prisma"),
        hasSupabase: stack.includes("supabase"),
        stack,
        scripts,
        packageName: project.name,
        packageManager: "npm",
      },
      risks,
      jobs,
      runId,
      runDir,
      reportJsonPath,
      reportMarkdownPath,
    };

    // ----------------------------
    // WRITE REPORTS
    // ----------------------------

    fs.writeFileSync(reportJsonPath, JSON.stringify(output, null, 2));

    fs.writeFileSync(
      reportMarkdownPath,
      [
        "# Maestro Autopilot Plan",
        "",
        "## Stack",
        stack.join(", "),
        "",
        "## Jobs",
        jobs.map((j) => `- ${j.id}`).join("\n"),
      ].join("\n")
    );

    return output;
  }
}

