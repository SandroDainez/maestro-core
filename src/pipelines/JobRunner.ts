// src/pipelines/JobRunner.ts

import { AutopilotPipeline } from "./AutopilotPipeline";

export class JobRunner {
  async runAutopilotScan(projectPath: string) {
    const pipeline = new AutopilotPipeline(projectPath);

    const result = pipeline.scan();

    console.log("🔎 Autopilot Scan result:");
    console.log(JSON.stringify(result, null, 2));

    return result;
  }
}

