// src/core/governance/GovernancePolicy.ts

import { MaestroMode, PhaseRisk } from "../../types";

export interface GovernanceAction {
  description: string;
  risk: PhaseRisk;
}

export class GovernancePolicy {
  static actionsForMode(mode: MaestroMode): GovernanceAction[] {
    if (mode === "rapid") {
      return [
        {
          description: "Executar alterações diretas sem confirmação",
          risk: "alto",
        },
      ];
    }

    if (mode === "execute") {
      return [
        {
          description: "Executar com confirmação humana",
          risk: "medio",
        },
      ];
    }

    return [
      {
        description: "Somente planejar",
        risk: "baixo",
      },
    ];
  }
}

