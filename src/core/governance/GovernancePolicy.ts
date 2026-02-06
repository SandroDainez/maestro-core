import { PhaseRisk } from "../../types";

export class GovernancePolicy {
  static getRisksForPhase(name: string) {
    if (name === "deploy") {
      return [{ name: "deploy", risk: PhaseRisk.HIGH }];
    }

    if (name === "database") {
      return [{ name: "deploy", risk: PhaseRisk.MEDIUM }];
    }

    return [{ name: "scaffold", risk: PhaseRisk.LOW }];
  }
}

