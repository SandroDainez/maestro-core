import { MaestroPhase, PhaseResult } from "./MaestroPhase";
import { MaestroContext, MaestroProject } from "../../types";

export class ScaffoldPhase extends MaestroPhase {
  name = "scaffold";

  constructor() {
    super([]);
  }

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: string
  ): Promise<PhaseResult> {
    console.log(`📦 Scaffold: ${project.name}`);

    // aqui depois entra create-next-app, monorepo, turbo etc

    return {
      success: true,
      message: "Scaffold criado com sucesso",
    };
  }
}

