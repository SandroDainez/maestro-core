import { prisma } from "../../../../src/db/prisma";
import { apiError, apiOk } from "@/src/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const run = await prisma.pipelineRun.findUnique({
      where: {
        id: params.id,
      },
      include: {
        project: true,
        phaseRuns: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    if (!run) {
      return apiError("Execução não encontrada", 404);
    }

    return apiOk({ run });
  } catch (err) {
    console.error("RUN DETAILS ERROR:", err);

    return apiError("Internal server error", 500);
  }
}
