// src/autopilot/RiskGate.ts

import { AutopilotRisk, PhaseRisk } from "../types";

/**
 * RiskGate
 * Decide se a execução automática é permitida
 */
export class RiskGate {
  allowExecution(risks: AutopilotRisk[]): boolean {
    return !risks.some((r) => r.risk === PhaseRisk.HIGH);
  }
}

