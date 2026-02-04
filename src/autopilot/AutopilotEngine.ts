import { ProjectScanner } from "./ProjectScanner";

export interface AutopilotResult {
  projectPath: string;
  issues: string[];
  recommendations: string[];
}

export class AutopilotEngine {
  async run(projectPath: string): Promise<AutopilotResult> {
    console.log("🤖 Autopilot iniciado...");
    console.log(`📂 Projeto: ${projectPath}`);

    const scanner = new ProjectScanner();
    const report = await scanner.scan(projectPath);

    const recommendations: string[] = [];

    for (const issue of report.issues) {
      if (issue.includes("node_modules")) {
        recommendations.push("Adicionar node_modules ao .gitignore");
      }

      if (issue.includes(".env")) {
        recommendations.push("Garantir .env no gitignore e criar .env.example");
      }

      if (issue.includes("Sem remote")) {
        recommendations.push("Configurar remote GitHub");
      }
    }

    return {
      projectPath,
      issues: report.issues,
      recommendations,
    };
  }
}

