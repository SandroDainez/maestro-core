import { MaestroPhase, PhaseResult } from "./MaestroPhase";
import { MaestroContext, MaestroProject } from "../../types";

export class DatabasePhase extends MaestroPhase {
  name = "database";

  constructor() {
    super(["auth"]); // depende do auth
  }

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: string
  ): Promise<PhaseResult> {
    console.log("🗄️ Database setup");

    // futuramente: prisma init, migrate, seed etc

    return {
      success: true,
      message: "Database configurado",
    };
  }
}

