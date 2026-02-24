"use client";

import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-white px-6 py-8">
        <div className="mb-10">
          <h1 className="text-2xl font-bold">Maestro Core</h1>
          <p className="text-sm text-gray-500">
            Orchestration Platform
          </p>
        </div>

        <nav className="space-y-1">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/runs"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            Pipeline Runs
          </Link>

          <Link
            href="/dashboard/users"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            Usuários
          </Link>

          <Link
            href="/dashboard/settings"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            Configurações
          </Link>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-8">
          <span className="text-sm font-medium text-gray-500">
            Painel Administrativo
          </span>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}