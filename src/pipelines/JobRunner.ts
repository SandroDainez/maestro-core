// src/pipelines/JobRunner.ts

import crypto from "crypto";
import { JobQueue, MaestroJob } from "./JobQueue";
import { MaestroEngine } from "../core/MaestroEngine";

export class JobRunner {
  private queue: JobQueue;
  private engine: MaestroEngine;
  private polling = false;

  constructor(queue: JobQueue, engine: MaestroEngine) {
    this.queue = queue;
    this.engine = engine;
  }

  start() {
    if (this.polling) return;
    this.polling = true;

    setInterval(async () => {
      if (!this.queue.hasCapacity()) return;

      const job = this.queue.dequeue();
      if (!job) return;

      this.queue.markRunning(job);

      try {
        await this.engine.runJob(job);
        this.queue.finish(job.id);
      } catch (err) {
        console.error("❌ Job falhou:", err);
        this.queue.finish(job.id);
      }
    }, 500);
  }
}

