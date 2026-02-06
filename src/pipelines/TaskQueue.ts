import { MaestroTask, TaskStatus } from "../types";

export class TaskQueue {
  async run(tasks: MaestroTask[]) {
    for (const task of tasks) {
      try {
        task.status = TaskStatus.RUNNING;

        await task.action.execute();

        task.status = TaskStatus.DONE;
      } catch (err) {
        task.status = TaskStatus.FAILED;
        throw err;
      }
    }
  }
}

