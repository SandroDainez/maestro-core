import { PhaseRisk } from "../../types";
import type { AutopilotRisk } from "../../types";

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

  static summarizeExecution(risks: AutopilotRisk[]) {
    const highRisks = risks.filter((risk) => risk.risk === PhaseRisk.HIGH);
    const mediumRisks = risks.filter((risk) => risk.risk === PhaseRisk.MEDIUM);

    return {
      highRiskCount: highRisks.length,
      mediumRiskCount: mediumRisks.length,
      requiresHumanApproval: highRisks.length > 0,
    };
  }
}
