import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { handleAutopilotRunRequest } from "@/src/server/handlers/autopilot";

const orchestrator = new MaestroOrchestrator();

export async function POST(req: Request) {
  return handleAutopilotRunRequest(req, orchestrator);
}
