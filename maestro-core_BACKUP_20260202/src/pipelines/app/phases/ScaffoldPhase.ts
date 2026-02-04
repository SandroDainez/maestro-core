import fs from "fs";
import path from "path";
import { MaestroContext, MaestroMode, MaestroProject } from "../../../types";
import { ShellRunner } from "../../../utils/ShellRunner";

export class ScaffoldPhase {
  id = "scaffold";
  label = "Scaffold do projeto";

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: MaestroMode
  ): Promise<string> {
    const created: string[] = [];

    const basePath = project.path;

    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    // Exemplo: criar README inicial
    const readmePath = path.join(basePath, "README.md");

    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(
        readmePath,
        `# ${project.name}

Projeto criado automaticamente pelo Maestro.

Objetivo:
${ctx.goal}

Gerado em: ${new Date().toISOString()}
`
      );

      created.push("README.md");
    }

    // Futuro: create-next-app, etc
    // await ShellRunner.exec("npx create-next-app@latest .", basePath);

    return `🧱 Scaffold criado (${created.length} arquivos iniciais).`;
  }
}

