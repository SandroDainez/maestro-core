import path from "path";
import { AutopilotScanOutput } from "../types";
import { writeJson, writeText } from "../utils/fsx";

export class ReportGenerator {
  write(runDir: string, output: AutopilotScanOutput) {
    const mdPath = path.join(runDir, "plan.md");
    const jsonPath = path.join(runDir, "run.json");

    const md = this.renderMarkdown(output);

    writeText(mdPath, md);
    writeJson(jsonPath, output);

    return { mdPath, jsonPath };
  }

  private renderMarkdown(o: AutopilotScanOutput) {
    const lines: string[] = [];

    lines.push(`# Maestro Autopilot Run`);
    lines.push(``);
    lines.push(`runId: ${o.runId}`);
    lines.push(`project: ${o.project.name}`);
    lines.push(`rootPath: ${o.project.rootPath}`);
    lines.push(``);

    lines.push(`## Stack`);
    lines.push(`- ${o.scan.stack.join(", ") || "—"}`);
    lines.push(``);

    lines.push(`## Scripts`);
    o.scan.scripts.forEach((s) => lines.push(`- ${s}`));

    lines.push(``);
    lines.push(`## Riscos`);
    o.risks.forEach((r) => {
      lines.push(`- [${r.risk}] ${r.title}`);
      lines.push(`  ${r.detail}`);
    });

    return lines.join("\n");
  }
}

