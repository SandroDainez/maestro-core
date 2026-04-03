import { z } from "zod";
import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { apiError, apiOk } from "@/src/lib/api";
import { authorizeAdmin } from "@/src/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  key: z.enum([
    "preferredStack",
    "defaultDomain",
    "codingStyle",
    "autoApproveLowRisk",
  ]),
  value: z.union([z.string(), z.boolean()]),
});

export async function GET() {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const orchestrator = new MaestroOrchestrator();
  return apiOk({ memory: orchestrator.getMemorySnapshot() });
}

export async function POST(req: Request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Payload invalido para memoria.", 400);
  }

  const orchestrator = new MaestroOrchestrator();
  orchestrator.updateMemoryPreference(parsed.data.key, parsed.data.value);
  return apiOk({ memory: orchestrator.getMemorySnapshot() });
}
