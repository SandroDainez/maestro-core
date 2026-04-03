// src/db/run.repository.ts

import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export class RunRepository {
  async create(
    projectId: string,
    type = "autopilot",
    analysis?: Prisma.InputJsonValue
  ) {
    return prisma.pipelineRun.create({
      data: {
        projectId,
        type,
        status: "queued",
        startedAt: new Date(),
        ...(analysis !== undefined ? { analysis } : {}),
      },
    });
  }

  async finish(runId: string, status = "success", analysis?: Prisma.InputJsonValue) {
    return prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: new Date(),
        ...(analysis !== undefined ? { analysis } : {}),
      },
    });
  }

  async finishLatest(projectId: string) {
    const latest = await prisma.pipelineRun.findFirst({
      where: { projectId },
      orderBy: { startedAt: "desc" },
    });

    if (!latest) return;

    await this.finish(latest.id);
  }

  async list() {
    return prisma.pipelineRun.findMany({
      orderBy: { startedAt: "desc" },
    });
  }

  async byId(id: string) {
    return prisma.pipelineRun.findUnique({
      where: { id },
    });
  }

  async listRecentByType(type?: string, limit = 10) {
    return prisma.pipelineRun.findMany({
      where: type ? { type } : {},
      include: {
        project: true,
        phaseRuns: true,
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }
}
