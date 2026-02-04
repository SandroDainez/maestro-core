import { v4 as uuidv4 } from "uuid";
import { MaestroTask, TaskStatus } from "../types";

export class TaskQueue {
  private tasks: MaestroTask[] = [];

  // ========================
  // ADD
  // ========================
  add(title: string, priority = 0): MaestroTask {
    const task: MaestroTask = {
      id: uuidv4(),
      title,
      priority,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    this.tasks.push(task);
    this.sort();

    return task;
  }

  // ========================
  // LOAD FROM SNAPSHOT
  // ========================
  load(tasks: MaestroTask[]) {
    this.tasks = [...tasks];
    this.sort();
  }

  // ========================
  // UPDATE STATUS
  // ========================
  update(id: string, status: TaskStatus) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    task.status = status;
  }

  // ========================
  // GET NEXT
  // ========================
  next(): MaestroTask | undefined {
    return this.tasks.find((t) => t.status === "pending");
  }

  // ========================
  // PEEK
  // ========================
  peek(): MaestroTask | undefined {
    return this.next();
  }

  // ========================
  // SORT
  // ========================
  private sort() {
    this.tasks.sort((a, b) => b.priority - a.priority);
  }

  // ========================
  // DUMP
  // ========================
  dump(): MaestroTask[] {
    return [...this.tasks];
  }

  // ========================
  // CLEAR
  // ========================
  clear() {
    this.tasks = [];
  }
}

