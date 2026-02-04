import { MaestroContext, MaestroMode, MaestroProject } from "../../../types";

export class DeployPhase {
  id = "deploy";
  label = "Deploy";

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: MaestroMode
  ): Promise<string> {
    return "🚀 DeployPhase (stub): deploy ainda não implementado.";
  }
}

