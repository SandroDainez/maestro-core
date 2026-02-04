// src/core/state/StateManager.ts

import fs from "fs";
import path from "path";

export type RunState = {
  id: string;
  projectId: string;
  branch: string;
  phases: string[];
  currentPhase: number;
  createdAt: string;
  finishedAt: string | null;
};

export class StateManager {
  private static filename = ".maestro-run.json";

  private static getPath(rootDir: string) {
    return path.join(rootDir, this.filename);
  }

  static writeRun(rootDir: string, state: RunState) {
    fs.writeFileSync(this.getPath(rootDir), JSON.stringify(state, null, 2));
  }

  static readRun(rootDir: string): RunState | null {
    const file = this.getPath(rootDir);
    if (!fs.existsSync(file)) return null;

    return JSON.parse(fs.readFileSync(file, "utf-8"));
  }

  static clear(rootDir: string) {
    const file = this.getPath(rootDir);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

