import { prisma } from "@/src/lib/prisma";
import { execCmd } from "@/src/lib/runner/exec";

export async function runPipeline(projectId: string, projectPath: string, phases: string[]) {
  // 1️⃣ Criar PipelineRun
  const run = await prisma.pipelineRun.create({
    data: {
      projectId,
      status: "queued"
    }
  });

  try {
    // 2️⃣ Marcar como running
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "running",
        startedAt: new Date()
      }
    });

    for (const phaseName of phases) {
      // 3️⃣ Criar fase
      const phase = await prisma.pipelinePhaseRun.create({
        data: {
          runId: run.id,
          phase: phaseName,
          status: "queued"
        }
      });

      try {
        await prisma.pipelinePhaseRun.update({
          where: { id: phase.id },
          data: {
            status: "running",
            startedAt: new Date()
          }
        });

        let result: any;

        switch (phaseName) {
          case "bun_install":
            result = await execCmd("bun", ["install"], { cwd: projectPath });
            break;

          case "bun_build":
            result = await execCmd("bun", ["run", "build"], { cwd: projectPath });
            break;

          case "npm_install":
            result = await execCmd("npm", ["install"], { cwd: projectPath });
            break;

          case "npm_build":
            result = await execCmd("npm", ["run", "build"], { cwd: projectPath });
            break;

          default:
            result = { stdout: "Skipped phase", stderr: "" };
        }

        await prisma.pipelinePhaseRun.update({
          where: { id: phase.id },
          data: {
            status: "success",
            logs: JSON.stringify(result),
            endedAt: new Date()
          }
        });

      } catch (error: any) {
        await prisma.pipelinePhaseRun.update({
          where: { id: phase.id },
          data: {
            status: "failed",
            logs: error.message || String(error),
            endedAt: new Date()
          }
        });

        throw error;
      }
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        endedAt: new Date()
      }
    });

  } catch (error) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        endedAt: new Date()
      }
    });
  }

  return run.id;
}
