import { TaskStatus, type MaestroJob, type MaestroTask } from "../../types";
import type { ProjectRegistry } from "../projects/ProjectRegistry";
import { AuthInstallRunner } from "./AuthInstallRunner";
import { AuthPhaseRunner } from "./AuthPhaseRunner";
import { DashboardLayoutRunner } from "./DashboardLayoutRunner";
import { PhaseRunner } from "./PhaseRunner";
import { RBACRunner } from "./RBACRunner";
import { SeedRunner } from "./SeedRunner";

export type PhaseDispatchResult = {
  tasks: MaestroTask[];
  runner: string;
  specialized: boolean;
};

export class PhaseExecutionDispatcher {
  constructor(private registry: ProjectRegistry) {}

  resolve(job: MaestroJob): PhaseDispatchResult {
    const phase = job.phase.toLowerCase();

    if (phase === "init") {
      return {
        tasks: this.toTasks("init", new PhaseRunner().getActions()),
        runner: "PhaseRunner",
        specialized: true,
      };
    }

    if (phase === "auth-install") {
      return {
        tasks: this.toTasks(job.phase, new AuthInstallRunner(this.registry).getActions()),
        runner: "AuthInstallRunner",
        specialized: true,
      };
    }

    if (phase === "auth-config" || phase === "auth") {
      return {
        tasks: this.toTasks(job.phase, new AuthPhaseRunner(this.registry).getActions()),
        runner: "AuthPhaseRunner",
        specialized: true,
      };
    }

    if (phase === "dashboard") {
      return {
        tasks: this.toTasks(job.phase, new DashboardLayoutRunner(this.registry).getActions()),
        runner: "DashboardLayoutRunner",
        specialized: true,
      };
    }

    if (phase === "rbac") {
      return {
        tasks: this.toTasks(job.phase, new RBACRunner(this.registry).getActions()),
        runner: "RBACRunner",
        specialized: true,
      };
    }

    if (phase === "seed") {
      return {
        tasks: this.toTasks(job.phase, new SeedRunner().getActions()),
        runner: "SeedRunner",
        specialized: true,
      };
    }

    return {
      tasks: job.tasks,
      runner: "PlannedJobTasks",
      specialized: false,
    };
  }

  private toTasks(phase: string, actions: ReturnType<PhaseRunner["getActions"]>): MaestroTask[] {
    return actions.map((action) => ({
      id: `${phase}:${action.id}`,
      action,
      status: TaskStatus.PENDING,
    }));
  }
}
