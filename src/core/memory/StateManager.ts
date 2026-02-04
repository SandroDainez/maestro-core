import fs from "fs";
import path from "path";

export type PhaseState = {
  name: string;
  status: "pending" | "running" | "success" | "failed";
};

export type RunState = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  phases: PhaseState[];
  branch?: string | null;
};

export class StateManager {
  static getStateDir(projectPath: string) {
    return path.join(projectPath, ".maestro");
  }

  static getStateFile(projectPath: string) {
    return path.join(this.getStateDir(projectPath), "state.json");
  }

  static ensure(projectPath: string) {
    const dir = this.getStateDir(projectPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static writeRun(projectPath: string, run: RunState) {
    this.ensure(projectPath);

    const file = this.getStateFile(projectPath);

    fs.writeFileSync(
      file,
      JSON.stringify(run, null, 2)
    );
  }

  static readRun(projectPath: string): RunState | null {
    const file = this.getStateFile(projectPath);

    if (!fs.existsSync(file)) return null;

    return JSON.parse(
      fs.readFileSync(file, "utf-8")
    );
  }
}

