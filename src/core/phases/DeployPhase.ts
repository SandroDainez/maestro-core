import { MaestroPhase, PhaseResult } from "./MaestroPhase";
import { MaestroContext, MaestroProject } from "../../types";

export class DeployPhase extends MaestroPhase {
  name = "deploy";

  constructor() {
    super(["dashboard"]);
  }

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: string
  ): Promise<PhaseResult> {
    console.log("🚀 Deploy phase");

    // futuramente: deploy vercel / docker / cloud

    return {
      success: true,
      message: "Deploy concluído",
    };
  }
}

