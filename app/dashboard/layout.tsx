import Link from "next/link";
import { ReactNode } from "react";
import DashboardHeader from "./components/DashboardHeader";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Pipeline Runs", href: "/dashboard/runs" },
  { label: "Usuários", href: "/dashboard/users" },
  { label: "Governança", href: "/dashboard/governance" },
  { label: "Configurações", href: "/dashboard/settings" },
  { label: "Maestro IA", href: "/dashboard/agent" },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-white/5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 px-6 py-10 text-white">
        <div className="mb-10 space-y-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white">
              M
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Maestro Core</h1>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Orchestration Platform
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-1" aria-label="Dashboard">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-2xl px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        <DashboardHeader />

        <main className="flex-1 px-10 py-10">
          <div className="mx-auto w-full max-w-6xl space-y-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
