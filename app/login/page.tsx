"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

const hints = [
  "Siga operações automatizadas com o Maestro IA",
  "Controle campanhas, runs e equipes em um só lugar",
  "Integre relatórios, copys e landings geradas em minutos",
];

export default function LoginPage() {
  const [from, setFrom] = useState("/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hintIdx, setHintIdx] = useState(0);

  useEffect(() => {
    const fromParam = new URLSearchParams(window.location.search).get("from");
    if (fromParam) setFrom(fromParam);

    const timer = setInterval(() => {
      setHintIdx((prev) => (prev + 1) % hints.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: from,
    });

    setLoading(false);

    if (!res || res.error) {
      setErr("Email ou senha inválidos.");
      return;
    }

    window.location.href = res.url ?? from;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-900/70 p-10 shadow-[0_60px_120px_rgba(2,6,23,0.75)] lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Orchestration Platform</p>
          <h1 className="text-4xl font-bold leading-tight">
            Bem-vindo ao Maestro Core
          </h1>
          <p className="text-sm text-slate-300">
            Tenha todo o poder de um agente de IA no mesmo painel: crie campanhas, valide runs e monitore permissão de times.
          </p>
          <div className="space-y-2 text-xs uppercase tracking-[0.4em] text-emerald-300">
            <p>Execuções monitoradas: <span className="font-semibold text-white">+124</span></p>
            <p>Alertas automatizados: <span className="font-semibold text-white">100%</span></p>
          </div>
          <p className="text-sm text-slate-400">{hints[hintIdx]}</p>
        </div>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Login</p>
            <h2 className="text-2xl font-semibold text-white">Acesse o painel administrativo</h2>
            <p className="text-sm text-slate-400">Use credenciais de administrador para continuar.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@maestro.com"
                required
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">
              Senha
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            {err && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                {err}
              </div>
            )}

            <button
              className="w-full rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-slate-950 shadow-[0_15px_30px_rgba(16,185,129,0.35)] transition hover:brightness-105 disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-xs uppercase tracking-[0.4em] text-slate-500">
            Use um usuário ativo cadastrado no banco
          </p>
        </div>
      </div>
    </div>
  );
}
