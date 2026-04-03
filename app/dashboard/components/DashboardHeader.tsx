"use client";

import { signOut, useSession } from "next-auth/react";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const displayName = session?.user?.name ?? "Maestro";

  return (
    <header className="sticky top-0 z-20 bg-slate-950/90 border-b border-white/5 px-10 py-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.6em] text-slate-400">
          Painel Administrativo
        </span>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <div className="flex flex-col gap-1 text-right">
            <span className="text-xs font-semibold text-white">{displayName}</span>
            <span className="text-[0.6rem] uppercase tracking-[0.5em] text-slate-400">
              {session?.user?.email ?? "usuario autenticado"}
            </span>
          </div>
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white transition hover:border-white/60"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
