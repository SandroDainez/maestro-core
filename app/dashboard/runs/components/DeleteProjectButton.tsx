"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  projectSlug?: string | null;
};

export default function DeleteProjectButton({ projectSlug }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const router = useRouter();

  if (!projectSlug) return null;

  async function handleDelete() {
    setLoading(true);
    setMessage(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setMessage("Informe um motivo para excluir o projeto.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectSlug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmedReason }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao remover o projeto");
      }

      router.push("/dashboard/runs");
    } catch (error: any) {
      setMessage(error?.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-rose-500/40 bg-rose-500/5 p-4 text-xs uppercase tracking-[0.3em] text-rose-100">
      <p className="text-sm font-semibold text-rose-200">Excluir projeto</p>
      <p className="text-[0.65rem] text-slate-200">
        A ação remove o projeto, seus runs, fases e arquivos gerados. Apenas admin e criador podem confirmar.
      </p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-rose-100"
        >
          Quero excluir
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-[0.55rem] text-rose-300">Confirme para continuar</p>
          <label className="text-[0.65rem] text-slate-200">
            Motivo da exclusão
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 h-20 w-full rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-rose-400"
              placeholder="Explique rapidamente por que esse projeto precisa ser removido"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="inline-flex grow items-center justify-center rounded-full bg-rose-500 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
            >
              {loading ? "Apagando..." : "Confirmar exclusão"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setConfirming(false);
                setReason("");
              }}
              className="inline-flex grow items-center justify-center rounded-full border border-rose-200 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    {message && <p className="text-[0.65rem] text-rose-200">{message}</p>}
  </div>
);
}
