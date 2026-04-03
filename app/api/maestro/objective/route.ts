import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { handleMaestroObjectiveRequest } from "@/src/server/handlers/maestro";

const orchestrator = new MaestroOrchestrator();

export async function POST(req: Request) {
  return handleMaestroObjectiveRequest(req, orchestrator);
}
