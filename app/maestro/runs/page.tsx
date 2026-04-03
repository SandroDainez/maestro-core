import Link from "next/link";
import { prisma } from "@/src/lib/prisma";

type Run = {
  id: string;
  status: string;
  startedAt: string | Date;
  finishedAt?: string | Date | null;
  project?: {
    name?: string | null;
  };
};

const statusStyles: Record<string, string> = {
  success: "bg-emerald-500/20 text-emerald-200",
  failed: "bg-rose-500/20 text-rose-200",
  running: "bg-sky-500/20 text-sky-200",
};

export const dynamic = "force-dynamic";

async function getRuns(): Promise<Run[]> {
  try {
    return await prisma.pipelineRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { project: true },
    });
  } catch {
    return [];
  }
}

function formatDate(date?: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RunsPage() {
  const runs = await getRuns();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-6 py-16">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-x-0 top-0 h-64 rounded-bl-[120px] bg-gradient-to-br from-emerald-500/40 via-cyan-500/30 to-transparent blur-[120px]" />
          <div className="absolute bottom-0 right-10 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-600/40 to-indigo-600/30 blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl space-y-6">
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
            Snapshot
          </p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Painel dinâmico das execuções do Maestro
          </h1>
          <p className="text-base text-slate-300">
            Aqui você observa rapidamente os runs recentes, identifica
            tendências de sucesso/erro e sai direto para o dashboard completo
            com histórico de cada fase.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/runs"
              className="rounded-full border border-white/30 px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white/60"
            >
              Abrir dashboard →
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/10 px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-300 transition hover:border-white/30"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-5">
          {runs.map((run) => {
            const status = run.status?.toLowerCase() ?? "queued";
            return (
              <article
                key={run.id}
                className="flex flex-col gap-4 rounded-[32px] border border-white/5 bg-white/5 p-6 shadow-[0_35px_80px_rgba(2,6,23,0.7)] transition hover:-translate-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">
                      {run.project?.name ?? "Projeto sem nome"}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Iniciado em {formatDate(run.startedAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] ${
                      statusStyles[status] ?? "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-xs uppercase tracking-[0.4em] text-slate-400">
                    <p>Run ID</p>
                    <p className="mt-2 font-mono text-sm text-white">
                      {run.id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-xs uppercase tracking-[0.4em] text-slate-400">
                    <p>Última atualização</p>
                    <p className="mt-2 text-sm text-white">
                      {run.finishedAt ? formatDate(run.finishedAt) : "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-xs uppercase tracking-[0.4em] text-slate-400">
                    <p>Status global</p>
                    <p className="mt-2 text-sm text-white">{run.status}</p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/runs/${run.id}`}
                  className="inline-flex items-center justify-center rounded-full border border-indigo-400/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-indigo-100 transition hover:border-indigo-200 hover:text-white"
                >
                  Ver detalhes
                </Link>
              </article>
            );
          })}

          {!runs.length && (
            <div className="rounded-[32px] border border-dashed border-white/30 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
              Nenhuma execução registrada no momento.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
