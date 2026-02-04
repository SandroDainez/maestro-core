// src/core/phases/PhaseRegistry.ts

import { MaestroPhase } from "./MaestroPhase";

export class PhaseRegistry {
  private static phases: Map<string, MaestroPhase> = new Map();

  static register(phase: MaestroPhase) {
    this.phases.set(phase.name, phase);
  }

  static get(name: string): MaestroPhase | undefined {
    return this.phases.get(name);
  }

  static list(): MaestroPhase[] {
    return Array.from(this.phases.values());
  }
}

