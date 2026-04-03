"use client";

import { useState } from "react";

type ReviewPayload = {
  summary?: string;
  recommendations?: string[];
  flaggedPhases?: string[];
  participants?: string[];
  phaseReviews?: Array<{
    phase: string;
    agents: string[];
    verdict: string;
    ownerAgent?: string;
    executionMode?: string;
    notes: string[];
  }>;
};

type WorkflowStage = {
  code: string;
  status: string;
  note: string;
};

export default function MaestroPlanningPreview() {
  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowStage[]>([]);

  async function handlePreview() {
    if (!request.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/maestro/objective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: `planeje e revise multi-agente: ${request}`,
          path: ".",
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel gerar preview");
      }

      const result = payload.result ?? {};
      setReview(result.multiAgentReview ?? null);
      setWorkflow(result.workflow ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao gerar preview");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_30px_70px_rgba(2,6,23,0.6)]">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          Maestro Planner
        </p>
        <h2 className="text-xl font-semibold text-white">
          Preview de revisão multi-agente
        </h2>
      </div>

      <div className="space-y-3">
        <textarea
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          placeholder="Descreva o que o Maestro deve planejar antes de executar."
        />
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading}
          className="rounded-full border border-cyan-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200 transition hover:border-cyan-200"
        >
          {loading ? "Gerando..." : "Gerar preview"}
        </button>
      </div>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      {review ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Resumo</p>
            <p className="mt-2 text-sm text-slate-200">{review.summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Participantes</p>
              <p className="mt-2 text-sm text-slate-200">
                {(review.participants ?? []).join(", ") || "Sem participantes"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fases sinalizadas</p>
              <p className="mt-2 text-sm text-slate-200">
                {(review.flaggedPhases ?? []).join(", ") || "Nenhuma"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recomendações</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-200">
              {(review.recommendations ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workflow</p>
            <div className="mt-3 space-y-2">
              {workflow.map((stage) => (
                <div
                  key={stage.code}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[0.7rem] uppercase tracking-[0.4em] text-cyan-300">
                      {stage.code}
                    </span>
                    <span className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400">
                      {stage.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{stage.note}</p>
                </div>
              ))}
            </div>
          </div>

          {(review.phaseReviews ?? []).length ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Parecer por fase
              </p>
              <div className="mt-3 space-y-3">
                {review.phaseReviews?.map((phaseReview) => (
                  <div
                    key={phaseReview.phase}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.7rem] uppercase tracking-[0.4em] text-cyan-300">
                        {phaseReview.phase}
                      </span>
                      <span className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400">
                        {phaseReview.verdict}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {phaseReview.agents.join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Owner: {phaseReview.ownerAgent ?? "Maestro-Orchestrator"} · Mode:{" "}
                      {phaseReview.executionMode ?? "standard"}
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      {phaseReview.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
