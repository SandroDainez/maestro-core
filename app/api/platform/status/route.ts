import { apiOk } from "@/src/lib/api";
import { authorizeAdmin } from "@/src/lib/admin";
import { PlatformReadinessService } from "@/src/core/platform/PlatformReadinessService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const service = new PlatformReadinessService();
  const status = await service.getStatus();
  return apiOk({ status });
}
