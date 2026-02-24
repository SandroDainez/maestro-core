import { prisma } from "@/src/lib/prisma";
import { execCmd } from "@/src/lib/runner/exec";

export async function executePipeline(runId: string) {
  const run = await prisma.pipelineRun.findUnique({
    where: { id: runId },
    include: {
      project: true,
      phases: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!run) throw new Error("Run not found");

  const cwd = run.project.path;

  for (const phase of run.phases) {
    if (phase.status === "success") continue;

    await prisma.pipelinePhaseRun.update({
      where: { id: phase.id },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    try {
      const result = await executePhase(phase.phase, cwd);

      await prisma.pipelinePhaseRun.update({
        where: { id: phase.id },
        data: {
          status: result.code === 0 ? "success" : "failed",
          logs: JSON.stringify(result, null, 2),
          endedAt: new Date(),
        },
      });

      if (result.code !== 0) {
        await prisma.pipelineRun.update({
          where: { id: run.id },
          data: { status: "failed", endedAt: new Date() },
        });

        return;
      }
    } catch (err: any) {
      await prisma.pipelinePhaseRun.update({
        where: { id: phase.id },
        data: {
          status: "failed",
          logs: String(err),
          endedAt: new Date(),
        },
      });

      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: { status: "failed", endedAt: new Date() },
      });

      return;
    }
  }

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: { status: "success", endedAt: new Date() },
  });
}

async function executePhase(phaseName: string, cwd: string) {
  switch (phaseName) {
    case "lint":
      return execCmd("npm", ["run", "lint"], { cwd });

    case "typecheck":
      return execCmd("npm", ["run", "typecheck"], { cwd });

    case "test":
      return execCmd("npm", ["run", "test"], { cwd });

    case "build":
      return execCmd("npm", ["run", "build"], { cwd });

    case "install":
      return execCmd("npm", ["install"], { cwd });

    default:
      return {
        code: 0,
        stdout: `Phase ${phaseName} not implemented`,
        stderr: "",
        durationMs: 0,
      };
  }
}
