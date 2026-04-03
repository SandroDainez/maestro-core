import {
  MaestroTask,
  TaskStatus,
  type PhaseExecutionDirective,
  type TaskExecutionContext,
  PhaseRisk,
} from "../types";

export class TaskQueue {
  private readonly guardOwners = new Set([
    "Architecture",
    "Governance",
    "Maestro-Orchestrator",
  ]);

  async run(tasks: MaestroTask[], directive?: PhaseExecutionDirective) {
    const logs: string[] = [];
    const context: TaskExecutionContext = {
      phase: directive?.phase,
      ownerAgent: directive?.ownerAgent,
      executionMode: directive?.executionMode,
    };

    for (const task of tasks) {
      try {
        task.status = TaskStatus.RUNNING;
        await this.applyPolicy(task, directive, logs);

        await task.action.execute(context);

        task.status = TaskStatus.DONE;
        logs.push(`task:${task.id}:done`);
      } catch (err) {
        task.status = TaskStatus.FAILED;
        throw err;
      }
    }

    return {
      logs,
      executedBy: directive?.ownerAgent ?? "Maestro-Orchestrator",
      mode: directive?.executionMode ?? "standard",
    };
  }

  private async applyPolicy(
    task: MaestroTask,
    directive: PhaseExecutionDirective | undefined,
    logs: string[]
  ) {
    if (!directive) return;

    if (this.guardOwners.has(directive.ownerAgent)) {
      logs.push(`guard:${directive.ownerAgent}:${task.id}`);
    }

    if (
      directive.executionMode === "architecture_guarded" &&
      task.action.type === "shell" &&
      task.action.risk === PhaseRisk.HIGH
    ) {
      throw new Error(
        `Política de arquitetura bloqueou comando shell de alto risco na fase ${directive.phase}.`
      );
    }

    if (
      directive.executionMode === "governance_guarded" &&
      task.action.type === "shell" &&
      [PhaseRisk.MEDIUM, PhaseRisk.HIGH].includes(task.action.risk)
    ) {
      throw new Error(
        `Política de governança bloqueou comando shell sem aprovação granular na fase ${directive.phase}.`
      );
    }
  }
}
