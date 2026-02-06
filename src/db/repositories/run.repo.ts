import { prisma } from "../prisma";
import { RunStatus } from "@prisma/client";

export class RunRepository {
  async create(projectId: string) {
    return prisma.pipelineRun.create({
      data: {
        projectId,
        status: RunStatus.running,
      },
    });
  }

  async finish(runId: string, status: RunStatus) {
    return prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status,
        endedAt: new Date(),
      },
    });
  }

  async list() {
    return prisma.pipelineRun.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}

