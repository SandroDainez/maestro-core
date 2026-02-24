import Link from "next/link";

type Run = {
  id: string;
  status: string;
  startedAt?: string;
  finishedAt?: string | null;
  project?: {
    name?: string | null;
  } | null;
};

async function getRuns(): Promise<Run[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const res = await fetch(`${baseUrl}/api/runs`, {
    cache: "no-store",
  });

  if (!res.ok) return [];

  return res.json();
}

function Badge({ status }: { status: string }) {
  const s = status?.toLowerCase();

  const map: Record<string, string> = {
    success: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    running: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        map[s] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}

export default async function RunsPage() {
  const runs = await getRuns();

  const total = runs.length;
  const success = runs.filter(
    (r) => r.status?.toLowerCase() === "success"
  ).length;
  const failed = runs.filter(
    (r) => r.status?.toLowerCase() === "failed"
  ).length;
  const running = runs.filter(
    (r) => r.status?.toLowerCase() === "running"
  ).length;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline Runs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Histórico de execuções do Maestro
          </p>
        </div>

        <Link
          href="/dashboard/runs"
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
        >
          Recarregar
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat title="Total" value={total} />
        <Stat title="Success" value={success} />
        <Stat title="Failed" value={failed} />
        <Stat title="Running" value={running} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4 text-sm font-medium">
          Execuções
        </div>

        {runs.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Nenhuma execução encontrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Run</th>
                <th className="px-6 py-3">Projeto</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Início</th>
                <th className="px-6 py-3">Fim</th>
                <th className="px-6 py-3 text-right">Detalhes</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono">
                    {run.id.slice(0, 8)}…
                  </td>

                  <td className="px-6 py-4">
                    {run.project?.name ?? "—"}
                  </td>

                  <td className="px-6 py-4">
                    <Badge status={run.status} />
                  </td>

                  <td className="px-6 py-4">
                    {run.startedAt
                      ? new Date(run.startedAt).toLocaleString()
                      : "—"}
                  </td>

                  <td className="px-6 py-4">
                    {run.finishedAt
                      ? new Date(run.finishedAt).toLocaleString()
                      : "—"}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/runs/${run.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="text-xs uppercase text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}