import { prisma } from "./prisma";
import { RunStatus } from "@prisma/client";

export class RunRepository {
  // =====================================================
  // CREATE RUN
  // =====================================================
  static async create(projectId: string, phases: string[]) {
    return prisma.pipelineRun.create({
      data: {
        projectId,
        status: "queued",
        phases: {
          create: phases.map((name) => ({
            name,
            status: "queued",
          })),
        },
      },
      include: { phases: true },
    });
  }

  // =====================================================
  // RUN LIFECYCLE
  // =====================================================
  static async startRun(runId: string) {
    return prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });
  }

  static async finishRun(runId: string, status: RunStatus) {
    return prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status,
        endedAt: new Date(),
      },
    });
  }

  static async resetRun(runId: string) {
    return prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status: "running",
        endedAt: null,
      },
    });
  }

  // =====================================================
  // HISTORY
  // =====================================================
  static async latestRun(projectId: string) {
    return prisma.pipelineRun.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { phases: true },
    });
  }

  static async runsForProject(projectId: string) {
    return prisma.pipelineRun.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { phases: true },
    });
  }

  static async findIncomplete(projectId: string) {
    return prisma.pipelineRun.findFirst({
      where: {
        projectId,
        status: { in: ["queued", "running", "failed"] },
      },
      orderBy: { createdAt: "desc" },
      include: { phases: true },
    });
  }

  // =====================================================
  // PHASE FLOW
  // =====================================================
  static async pendingPhases(runId: string) {
    return prisma.pipelinePhaseRun.findMany({
      where: {
        runId,
        status: { in: ["queued", "failed"] },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async startPhase(runId: string, name: string) {
    return prisma.pipelinePhaseRun.updateMany({
      where: { runId, name },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });
  }

  static async finishPhase(
    runId: string,
    name: string,
    status: RunStatus,
    logs?: string
  ) {
    return prisma.pipelinePhaseRun.updateMany({
      where: { runId, name },
      data: {
        status,
        endedAt: new Date(),
        logs: logs ?? null,
      },
    });
  }

  static async resetPhase(runId: string, name: string) {
    return prisma.pipelinePhaseRun.updateMany({
      where: { runId, name },
      data: {
        status: "queued",
        startedAt: null,
        endedAt: null,
        logs: null,
      },
    });
  }
}

