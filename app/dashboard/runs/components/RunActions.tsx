"use client";

import { useState } from "react";

type Props = {
  objective?: string | null;
};

export default function RunActions({ objective }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!objective) {
    return null;
  }

  async function handleRerun() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/agent/objective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Não foi possível reexecutar");
      }
      const data = await res.json();
      setMessage(`Nova execução criada: run ${data.runId}`);
    } catch (error: any) {
      setMessage(error?.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
        Reexecutar objetivo
      </p>
      <p className="text-sm text-slate-300">
        Você pode disparar novamente o mesmo objetivo sem precisar reescrever o briefing.
      </p>
      <button
        type="button"
        onClick={handleRerun}
        disabled={loading}
        className="rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-200"
      >
        {loading ? "Reexecutando..." : "Reexecutar objetivo"}
      </button>
      {message && <p className="text-[0.7rem] text-slate-300">{message}</p>}
    </div>
  );
}
