// src/core/phases/registerPhases.ts

import { PhaseRegistry } from "./PhaseRegistry";

import { ScaffoldPhase } from "./ScaffoldPhase";
import { AuthPhase } from "./AuthPhase";
import { DatabasePhase } from "./DatabasePhase";
import { DashboardPhase } from "./DashboardPhase";
import { DeployPhase } from "./DeployPhase";

/**
 * Registra TODAS as fases disponíveis no Maestro
 * Deve ser chamado no bootstrap (index.ts)
 */
export function registerPhases() {
  PhaseRegistry.register(new ScaffoldPhase());
  PhaseRegistry.register(new AuthPhase());
  PhaseRegistry.register(new DatabasePhase());
  PhaseRegistry.register(new DashboardPhase());
  PhaseRegistry.register(new DeployPhase());
}

