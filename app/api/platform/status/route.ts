import { apiOk } from "@/src/lib/api";
import { authorizeAdmin } from "@/src/lib/admin";
import { PlatformReadinessService } from "@/src/core/platform/PlatformReadinessService";

const service = new PlatformReadinessService();

export async function GET() {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const status = await service.getStatus();
  return apiOk({ status });
}
