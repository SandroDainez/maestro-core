// app/dashboard/runs/[id]/page.tsx

import Link from "next/link";
import { headers } from "next/headers";

interface Run {
  id: string;
  status: string;
  createdAt: string;
  endedAt: string | null;
  project?: { name: string | null };
  phaseRuns?: Array<{
    id: string;
    phase: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    error: string | null;
    createdAt: string;
  }>;
}

function getBaseUrl() {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function getRun(id: string): Promise<Run | null> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/runs/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function RunDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const run = await getRun(params.id);

  if (!run) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Execução não encontrada</h1>
        <Link href="/dashboard/runs">⬅ Voltar</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Link href="/dashboard/runs">⬅ Voltar</Link>

      <h1 className="text-2xl font-bold">Detalhes da Execução</h1>

      <div className="border p-4 rounded space-y-2">
        <p>
          <strong>ID:</strong> {run.id}
        </p>
        <p>
          <strong>Status:</strong> {run.status}
        </p>
        <p>
          <strong>Projeto:</strong> {run.project?.name ?? "-"}
        </p>
        <p>
          <strong>Criado:</strong>{" "}
          {new Date(run.createdAt).toLocaleString()}
        </p>
        <p>
          <strong>Finalizado:</strong>{" "}
          {run.endedAt ? new Date(run.endedAt).toLocaleString() : "—"}
        </p>
      </div>

      <div className="border p-4 rounded">
        <h2 className="text-lg font-bold mb-2">Fases</h2>

        {!run.phaseRuns?.length ? (
          <p>Sem fases registradas.</p>
        ) : (
          <div className="space-y-2">
            {run.phaseRuns.map((p) => (
              <div key={p.id} className="border rounded p-3">
                <div className="flex gap-3 flex-wrap">
                  <span>
                    <strong>Phase:</strong> {p.phase}
                  </span>
                  <span>
                    <strong>Status:</strong> {p.status}
                  </span>
                  <span>
                    <strong>Início:</strong>{" "}
                    {p.startedAt ? new Date(p.startedAt).toLocaleString() : "—"}
                  </span>
                  <span>
                    <strong>Fim:</strong>{" "}
                    {p.endedAt ? new Date(p.endedAt).toLocaleString() : "—"}
                  </span>
                </div>

                {p.error ? (
                  <pre className="mt-2 p-2 bg-black text-white overflow-auto rounded">
                    {p.error}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

