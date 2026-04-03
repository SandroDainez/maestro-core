import { apiError, apiOk } from "@/src/lib/api";
import { authorizeAdmin } from "@/src/lib/admin";
import { OperationalAnalyticsService } from "@/src/core/platform/OperationalAnalyticsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCsvRows(analytics: Awaited<ReturnType<OperationalAnalyticsService["getSummary"]>>) {
  const header = ["day", "runs", "reviews", "approvalBlocks", "specializedRuns"];
  const rows = analytics.timeline.map((point) => [
    point.day,
    String(point.runs),
    String(point.reviews),
    String(point.approvalBlocks),
    String(point.specializedRuns),
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export async function GET(request: Request) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isNaN(rawLimit) ? 30 : rawLimit;
  const rawDays = Number.parseInt(url.searchParams.get("days") ?? "", 10);
  const days = Number.isNaN(rawDays) ? 30 : rawDays;
  const runner = url.searchParams.get("runner") ?? undefined;
  const guard = url.searchParams.get("guard") ?? undefined;
  const format = url.searchParams.get("format") ?? "json";

  try {
    const service = new OperationalAnalyticsService();
    const analytics = await service.getSummary({ type, limit, days, runner, guard });
    if (format === "csv") {
      const csv = toCsvRows(analytics);
      const filename = `analytics-${type ?? "all"}-${days}d.csv`;
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return apiOk({ analytics });
  } catch (error) {
    console.error("Erro em /api/platform/analytics:", error);
    return apiError("Erro ao gerar analytics operacionais", 500);
  }
}
