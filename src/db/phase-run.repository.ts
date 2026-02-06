// src/db/phase-run.repository.ts

import { prisma } from "./prisma";
import type { PhaseStatus } from "@prisma/client";

export class PhaseRunRepository {
  async create(runId: string, phase: string) {
    return prisma.pipelinePhaseRun.create({
      data: {
        runId,
        phase,
        status: "running" as PhaseStatus,
      },
    });
  }

  async finish(id: string, status: PhaseStatus) {
    return prisma.pipelinePhaseRun.update({
      where: { id },
      data: {
        status,
        endedAt: new Date(),
      },
    });
  }
}

