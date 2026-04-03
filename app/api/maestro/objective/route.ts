import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { handleMaestroObjectiveRequest } from "@/src/server/handlers/maestro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orchestrator = new MaestroOrchestrator();
  return handleMaestroObjectiveRequest(req, orchestrator);
}
