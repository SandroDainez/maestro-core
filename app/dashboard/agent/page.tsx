 "use client";

import { FormEvent, useState } from "react";
import AgentHistory from "./components/AgentHistory";
import MaestroPlanningPreview from "./components/MaestroPlanningPreview";

const phases = [
  { label: "Pesquisa", description: "Mapear produto, benefícios e público." },
  { label: "Copy e landing", description: "Criação de texto e página de captura." },
  { label: "Campanha e monitoramento", description: "Plano de anúncio e relatórios." },
];

const agentPanelClass =
  "space-y-10 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-slate-900/70 p-10 text-white shadow-[0_40px_90px_rgba(2,6,23,0.8)] backdrop-blur";

export default function AgentPage() {
  const [objective, setObjective] = useState("");
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("running");
    setMessage(null);

    const payload = {
      objective,
      context: {
        product,
        audience,
      },
    };

    try {
      const res = await fetch("/api/agent/objective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Não foi possível iniciar o agente");
      }

      const data = await res.json();
      setStatus("success");
      setMessage(`Execução criada: run ${data.runId}`);
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message ?? "Erro desconhecido");
    }
  }

  return (
    <div className={agentPanelClass}>
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.6em] text-slate-400">
          Maestro IA
        </p>
        <h1 className="text-3xl font-semibold">
          Dê um objetivo e deixe o agente executar a campanha completa.
        </h1>
        <p className="text-sm text-slate-300">
          Ele gera pesquisa, landing, copy, campanhas e relatórios automaticamente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {phases.map((phase) => (
          <div
            key={phase.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              {phase.label}
            </p>
            <p className="mt-2 text-sm text-slate-100">{phase.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Objetivo geral
          </label>
          <textarea
            required
            className="mt-2 w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
            rows={3}
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            placeholder="Ex: lançar campanha de afiliado para o produto X com foco em público Y"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Produto
            <input
              className="mt-2 w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
              placeholder="Nome do produto ou nicho"
            />
          </label>

          <label className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Público
            <input
              className="mt-2 w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Quem queremos impactar"
            />
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-500/80 to-blue-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-cyan-500/30 transition hover:opacity-90"
          disabled={status === "running"}
        >
          {status === "running" ? "Executando..." : "Enviar objetivo"}
        </button>

        {message && (
          <p
            className={`text-sm font-medium ${
              status === "error" ? "text-rose-200" : "text-emerald-200"
            }`}
          >
            {message}
          </p>
        )}
        </form>
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_30px_70px_rgba(2,6,23,0.6)]">
            <AgentHistory />
          </div>
          <MaestroPlanningPreview />
        </div>
      </div>
    </div>
  );
}
