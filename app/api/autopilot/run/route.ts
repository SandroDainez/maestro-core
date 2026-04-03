import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";
import { handleAutopilotRunRequest } from "@/src/server/handlers/autopilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orchestrator = new MaestroOrchestrator();
  return handleAutopilotRunRequest(req, orchestrator);
}
