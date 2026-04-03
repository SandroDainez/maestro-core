import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { handleAutopilotScanRequest } from "@/src/server/handlers/autopilot";

const orchestrator = new MaestroOrchestrator();

export async function POST(req: Request) {
  return handleAutopilotScanRequest(req, orchestrator);
}
