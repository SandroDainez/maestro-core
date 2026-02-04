import { MaestroPhase, PhaseResult } from "./MaestroPhase";
import { MaestroContext, MaestroProject } from "../../types";

export class DashboardPhase extends MaestroPhase {
  name = "dashboard";

  constructor() {
    super(["database"]); // depende do banco pronto
  }

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: string
  ): Promise<PhaseResult> {
    console.log("📊 Dashboard setup");

    // futuramente: layout admin, frontend base, charts, etc

    return {
      success: true,
      message: "Dashboard configurado",
    };
  }
}

