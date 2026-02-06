import { MaestroAction, PhaseRisk } from "../../types";
import { ProjectRegistry } from "../projects/ProjectRegistry";

export class AuthPhaseRunner {
  constructor(private registry: ProjectRegistry) {}

  getActions(): MaestroAction[] {
    const projectPath = this.registry.getActiveProject().rootPath;

    return [
      {
        id: "auth-supabase",
        name: "Instalar Supabase SDK",
        type: "install",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          console.log("Supabase SDK em", projectPath);
        },
      },
      {
        id: "auth-env",
        name: "Criar .env.example",
        type: "config",
        risk: PhaseRisk.LOW,
        execute: async () => {},
      },
      {
        id: "auth-middleware",
        name: "Criar middleware auth",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {},
      },
      {
        id: "auth-login",
        name: "Criar página login",
        type: "scaffold",
        risk: PhaseRisk.LOW,
        execute: async () => {},
      },
    ];
  }
}

