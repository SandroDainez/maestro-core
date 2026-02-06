import { MaestroAction, PhaseRisk } from "../../types";

export class PhaseRunner {
  getActions(): MaestroAction[] {
    return [
      {
        id: "vision",
        name: "Definir visão do projeto",
        type: "plan",
        risk: PhaseRisk.LOW,
        execute: async () => {},
      },
      {
        id: "arch",
        name: "Gerar arquitetura inicial",
        type: "plan",
        risk: PhaseRisk.LOW,
        execute: async () => {},
      },
      {
        id: "mkdir",
        name: "Criar diretório do projeto",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {},
      },
      {
        id: "nextjs",
        name: "Scaffold Next.js",
        type: "scaffold",
        risk: PhaseRisk.HIGH,
        execute: async () => {},
      },
    ];
  }
}

