import { MaestroAction, PhaseRisk } from "../../types";

export class SeedRunner {
  getActions(): MaestroAction[] {
    return [
      {
        id: "seed-prisma",
        name: "Criar seed Prisma",
        type: "seed",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {},
      },
    ];
  }
}

