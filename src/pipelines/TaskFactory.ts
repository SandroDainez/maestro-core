// src/pipelines/TaskFactory.ts

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import {
  MaestroTask,
  MaestroAction,
  PhaseRisk,
  TaskStatus,
} from "../types";

export class TaskFactory {
  constructor(
    private readonly root: string,
    private readonly apply: boolean
  ) {}

  // ======================
  // SHELL COMMAND
  // ======================

  buildShellTask(
    id: string,
    title: string,
    cmd: string,
    risk: PhaseRisk
  ): MaestroTask {
    const action: MaestroAction = {
      id,
      name: title,
      type: "shell",
      risk,
      execute: async () => {
        if (!this.apply) {
          console.log("📝 [DRY-RUN]", cmd);
          return;
        }

        console.log("⚙️", cmd);

        execSync(cmd, {
          cwd: this.root,
          stdio: "inherit",
        });
      },
    };

    return {
      id,
      action,
      status: TaskStatus.PENDING,
    };
  }

  // ======================
  // WRITE FILE
  // ======================

  buildWriteFileTask(
    id: string,
    file: string,
    content: string,
    risk: PhaseRisk
  ): MaestroTask {
    const action: MaestroAction = {
      id,
      name: `write:${file}`,
      type: "fs",
      risk,
      execute: async () => {
        if (!this.apply) {
          console.log("📝 [DRY-RUN] write", file);
          return;
        }

        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);

        console.log("📄 wrote", file);
      },
    };

    return {
      id,
      action,
      status: TaskStatus.PENDING,
    };
  }
}

