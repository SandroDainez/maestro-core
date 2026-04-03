import { z } from "zod";
import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { apiError, apiOk } from "@/src/lib/api";

const BodySchema = z.object({
  path: z.string().min(1),
  objective: z.string().optional(),
});

const orchestrator = new MaestroOrchestrator();

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid body", 400);
  }

  const result = await orchestrator.reportProject(
    parsed.data.path,
    parsed.data.objective
  );

  return apiOk({ result });
}
