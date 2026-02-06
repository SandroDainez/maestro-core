// src/db/run.repository.ts

import { prisma } from "./prisma";

export class RunRepository {
  async create(projectId: string) {
    return prisma.pipelineRun.create({
      data: {
        projectId,
        status: "queued",
      },
    });
  }

  async finishLatest(projectId: string) {
    const latest = await prisma.pipelineRun.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (!latest) return;

    await prisma.pipelineRun.update({
      where: { id: latest.id },
      data: {
        status: "success",
        endedAt: new Date(),
      },
    });
  }

  async list() {
    return prisma.pipelineRun.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async byId(id: string) {
    return prisma.pipelineRun.findUnique({
      where: { id },
    });
  }
}

