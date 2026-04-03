import { z } from "zod";
import { apiError, apiOk } from "../../lib/api";

const ObjectiveBodySchema = z.object({
  request: z.string().min(1),
  path: z.string().optional(),
});

type MaestroObjectiveRunner = {
  handleHumanRequest(input: { request: string; path?: string }): Promise<unknown>;
};

export async function handleMaestroObjectiveRequest(
  req: Request,
  orchestrator: MaestroObjectiveRunner
) {
  const body = await req.json().catch(() => null);
  const parsed = ObjectiveBodySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Body invalido. Envie ao menos { request }.", 400);
  }

  try {
    const result = await orchestrator.handleHumanRequest(parsed.data);
    return apiOk({ result });
  } catch (error: any) {
    console.error("Erro em /api/maestro/objective:", error);
    return apiError(error?.message ?? "Erro ao processar objetivo humano", 500);
  }
}
