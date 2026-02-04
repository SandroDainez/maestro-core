import { MaestroPhase, PhaseResult } from "./MaestroPhase";
import { MaestroContext, MaestroProject } from "../../types";

export class AuthPhase extends MaestroPhase {
  name = "auth";

  constructor() {
    super(["scaffold"]);
  }

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: string
  ): Promise<PhaseResult> {
    console.log("🔐 Auth setup");

    // aqui depois entra instalação real: Clerk, Supabase, NextAuth etc

    return {
      success: true,
      message: "Auth configurado com sucesso",
    };
  }
}

