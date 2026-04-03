import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type PhaseStatus = "queued" | "running" | "success" | "failed";

export class PhaseRunRepository {
  async create(runId: string, phase: string) {
    return prisma.pipelinePhaseRun.create({
      data: {
        runId,
        phase,
        status: "queued",
      },
    });
  }

  async markRunning(id: string) {
    return prisma.pipelinePhaseRun.update({
      where: { id },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });
  }

  async finish(
    id: string,
    status: "success" | "failed",
    payload?: {
      logs?: Prisma.InputJsonValue;
      error?: string;
      details?: string;
      outputs?: Prisma.InputJsonValue;
    }
  ) {
    return prisma.pipelinePhaseRun.update({
      where: { id },
      data: {
        status,
        finishedAt: new Date(),
        ...(payload?.logs !== undefined ? { logs: payload.logs } : {}),
        ...(payload?.error !== undefined ? { error: payload.error } : {}),
        ...(payload?.details !== undefined ? { details: payload.details } : {}),
        ...(payload?.outputs !== undefined ? { outputs: payload.outputs } : {}),
      },
    });
  }

  async listByRun(runId: string) {
    return prisma.pipelinePhaseRun.findMany({
      where: { runId },
      orderBy: { startedAt: "asc" },
    });
  }
}
