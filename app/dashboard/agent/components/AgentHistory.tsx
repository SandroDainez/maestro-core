"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AgentRunPreview = {
  id: string;
  status: string;
  startedAt: string;
  objective?: string | null;
};

const statusStyles: Record<string, string> = {
  success: "text-emerald-400",
  failed: "text-rose-400",
  running: "text-sky-300",
  queued: "text-slate-400",
};

export default function AgentHistory() {
  const [runs, setRuns] = useState<AgentRunPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/runs?type=agent&limit=6")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setRuns(
          (data.runs ?? []).map((run: any) => {
            const analysis = run.analysis && typeof run.analysis === "object" ? run.analysis : null;
            return {
              id: run.id,
              status: run.status,
              startedAt: run.startedAt,
              objective: analysis?.objective ?? null,
            };
          })
        );
      })
      .catch((error) => setError(error?.message ?? "Erro ao buscar runs"))
      .finally(() => setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-300">Carregando histórico...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-200">{error}</p>;
  }

  if (!runs.length) {
    return (
      <p className="rounded-2xl border border-dashed border-white/30 bg-slate-900/60 p-4 text-sm text-slate-400">
        Nenhuma execução do Maestro IA foi registrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-200"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[0.65rem] font-semibold uppercase tracking-[0.4em] ${statusStyles[
                run.status.toLowerCase() as keyof typeof statusStyles
              ]}`}
            >
              {run.status}
            </span>
            <Link
              href={`/dashboard/runs/${run.id}`}
              className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-cyan-300"
            >
              Ver detalhes
            </Link>
          </div>
          <p className="text-xs text-slate-400">
            {new Date(run.startedAt).toLocaleString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-sm text-white">
            {run.objective || "Objetivo sem registro"}
          </p>
        </div>
      ))}
    </div>
  );
}
