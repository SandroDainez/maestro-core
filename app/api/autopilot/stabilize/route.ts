import { z } from "zod";
import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { apiError, apiOk } from "@/src/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  path: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid body", 400);
  }

  const orchestrator = new MaestroOrchestrator();
  const result = await orchestrator.runProject(parsed.data.path, true);
  return apiOk({ result });
}
