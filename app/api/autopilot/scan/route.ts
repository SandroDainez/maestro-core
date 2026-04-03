import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { handleAutopilotScanRequest } from "@/src/server/handlers/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orchestrator = new MaestroOrchestrator();
  return handleAutopilotScanRequest(req, orchestrator);
}
