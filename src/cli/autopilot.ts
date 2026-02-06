// src/autopilot/RiskGate.ts

import { AutopilotRisk, MaestroMode, PhaseRisk } from "../types";

export class RiskGate {
  /**
   * Regra atual:
   * - PLAN: nunca executa nada
   * - EXECUTE: bloqueia se existir algum risco HIGH
   * - SLOW: por enquanto permite (no futuro você pode exigir confirmação humana, etc.)
   */
  allowExecution(risks: AutopilotRisk[], mode: MaestroMode): boolean {
    if (mode === MaestroMode.PLAN) return false;

    if (mode === MaestroMode.EXECUTE) {
      const hasHigh = risks.some((r) => r.risk === PhaseRisk.HIGH);
      return !hasHigh;
    }

    // MaestroMode.SLOW
    return true;
  }
}

