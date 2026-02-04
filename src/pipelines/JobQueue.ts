// src/pipelines/JobQueue.ts

type JobStatus = "queued" | "running" | "finished" | "error" | "aborted";

export interface MaestroJob {
  id: string;
  projectId: string;
  type: "run" | "resume" | "retry";
  phases?: string[];
  phase?: string;
  status: JobStatus;
  createdAt: Date;
}

export class JobQueue {
  private queue: MaestroJob[] = [];
  private running: MaestroJob[] = [];
  private concurrency = 2;

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  enqueue(job: MaestroJob) {
    this.queue.push(job);
  }

  getQueue() {
    return this.queue;
  }

  getRunning() {
    return this.running;
  }

  hasCapacity() {
    return this.running.length < this.concurrency;
  }

  dequeue(): MaestroJob | undefined {
    return this.queue.shift();
  }

  markRunning(job: MaestroJob) {
    job.status = "running";
    this.running.push(job);
  }

  finish(jobId: string) {
    this.running = this.running.filter((j) => j.id !== jobId);
  }
}

