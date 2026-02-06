// src/autopilot/PreviewEngine.ts

import { exec } from "child_process";
import util from "util";

import { PreviewDiff } from "../types";

const execAsync = util.promisify(exec);

export class PreviewEngine {
  async generate(): Promise<PreviewDiff[]> {
    try {
      const { stdout } = await execAsync("git diff");

      if (!stdout || !stdout.trim()) {
        return [];
      }

      return [
        {
          file: "git",
          diff: stdout,
        },
      ];
    } catch (err) {
      console.warn("⚠️ PreviewEngine falhou:", err);
      return [];
    }
  }
}

