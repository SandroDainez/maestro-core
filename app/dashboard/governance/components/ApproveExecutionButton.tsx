"use client";

import { useState } from "react";

type Props = {
  projectPath: string;
  blockedPhases?: string[];
};

export default function ApproveExecutionButton({
  projectPath,
  blockedPhases = [],
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPhases, setSelectedPhases] = useState<string[]>(blockedPhases);

  async function handleApprove() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/autopilot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: projectPath,
          autoExecute: true,
          approved: selectedPhases.length === 0,
          approvedPhases: selectedPhases,
          actor: "dashboard-admin",
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel aprovar a execucao");
      }

      const status = payload?.result?.execution?.status ?? "planned";
      const runId = payload?.result?.execution?.runRecordId;
      setMessage(
        status === "executed"
          ? `Execucao aprovada. Run persistido: ${runId ?? "sem id"}.`
          : `Fluxo aprovado com status ${status}.`
      );
    } catch (error: any) {
      setMessage(error?.message ?? "Erro ao aprovar execucao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-sm text-amber-100">
      <p className="text-xs uppercase tracking-[0.4em] text-amber-200">
        Aprovação humana
      </p>
      <p className="text-sm text-amber-50/90">
        Use esta ação quando a execução automática exigir override explícito por risco alto.
      </p>
      {blockedPhases.length ? (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-amber-100">
            Fases bloqueadas
          </p>
          <div className="space-y-2">
            {blockedPhases.map((phase) => {
              const checked = selectedPhases.includes(phase);
              return (
                <label key={phase} className="flex items-center gap-2 text-sm text-amber-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedPhases((current) =>
                        checked
                          ? current.filter((item) => item !== phase)
                          : [...current, phase]
                      )
                    }
                  />
                  <span>{phase}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleApprove}
        disabled={loading}
        className="rounded-full border border-amber-200/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100 transition hover:border-amber-100"
      >
        {loading ? "Aprovando..." : "Aprovar e executar"}
      </button>
      {message ? <p className="text-[0.75rem] text-amber-50">{message}</p> : null}
    </div>
  );
}
