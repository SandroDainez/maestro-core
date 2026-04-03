import { prisma } from "../../../src/lib/prisma";
import { apiError, apiOk } from "@/src/lib/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "", 10);
  const take = Number.isNaN(rawLimit) ? 10 : Math.min(rawLimit, 50);

  try {
    const runs = await prisma.pipelineRun.findMany({
      where: type ? { type } : undefined,
      orderBy: { startedAt: "desc" },
      take,
      include: {
        project: true,
        phaseRuns: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    return apiOk({ runs });
  } catch (error) {
    console.error("Erro listando runs:", error);
    return apiError("Erro ao buscar execuções", 500);
  }
}
