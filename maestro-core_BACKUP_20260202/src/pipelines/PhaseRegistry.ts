import { ScaffoldPhase } from "./app/phases/ScaffoldPhase";
import { AuthPhase } from "./app/phases/AuthPhase";
import { DatabasePhase } from "./app/phases/DatabasePhase";
import { DashboardPhase } from "./app/phases/DashboardPhase";
import { DeployPhase } from "./app/phases/DeployPhase";

import { MaestroContext, MaestroMode, MaestroProject } from "../types";

export interface MaestroPhase {
  id: string;
  label: string;

  run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: MaestroMode
  ): Promise<string>;
}

export class PhaseRegistry {
  private static phases: Record<string, MaestroPhase> = {
    scaffold: new ScaffoldPhase(),
    auth: new AuthPhase(),
    database: new DatabasePhase(),
    dashboard: new DashboardPhase(),
    deploy: new DeployPhase(),
  };

  static get(id: string): MaestroPhase {
    const phase = this.phases[id];

    if (!phase) {
      throw new Error(`Fase não registrada: ${id}`);
    }

    return phase;
  }

  static list(): string[] {
    return Object.keys(this.phases);
  }
}

