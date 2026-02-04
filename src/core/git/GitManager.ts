// src/core/git/GitManager.ts

import { execSync } from "child_process";

export class GitManager {
  private static run(cmd: string, cwd: string) {
    execSync(cmd, {
      cwd,
      stdio: "inherit",
    });
  }

  // ============================
  // CREATE RUN BRANCH
  // ============================
  static createRunBranch(projectPath: string, runId: string) {
    const branch = `run/${runId}`;

    try {
      this.run(`git checkout -b ${branch}`, projectPath);
    } catch {
      this.run(`git checkout ${branch}`, projectPath);
    }
  }

  // ============================
  // CHECKOUT
  // ============================
  static checkout(projectPath: string, branch: string) {
    this.run(`git checkout ${branch}`, projectPath);
  }

  // ============================
  // COMMIT PHASE
  // ============================
  static commitPhase(projectPath: string, phase: string) {
    try {
      this.run(`git add .`, projectPath);
      this.run(`git commit -m "phase: ${phase}"`, projectPath);
    } catch {
      console.log(`ℹ️ Nada para commitar na fase ${phase}`);
    }
  }
}

