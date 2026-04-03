import { apiOk } from "@/src/lib/api";
import { authorizeAdmin } from "@/src/lib/admin";
import { MaestroOrchestrator } from "@/src/core/orchestration/MaestroOrchestrator";

const orchestrator = new MaestroOrchestrator();

export async function GET(request: Request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isNaN(rawLimit) ? 50 : Math.min(rawLimit, 200);

  return apiOk({ events: orchestrator.getAuditEvents(limit) });
}
