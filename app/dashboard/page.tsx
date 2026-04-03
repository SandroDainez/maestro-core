import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { OperationalAnalyticsService } from "@/src/core/platform/OperationalAnalyticsService";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const analyticsService = new OperationalAnalyticsService();
  const [latestRun, userCount, projectCount, recentDeletions, runStats, activeAdmins, recentRuns] = await Promise.all([
    prisma.pipelineRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { analysis: true },
    }),
    prisma.user.count(),
    prisma.project.count(),
    prisma.deletionAudit.findMany({
      take: 5,
      orderBy: { deletedAt: "desc" },
    }),
    prisma.pipelineRun.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.count({
      where: {
        status: "active",
        role: { in: ["admin", "owner", "Admin", "Owner"] },
      },
    }),
    analyticsService.getSummary({ limit: 30 }),
  ]);
  const analysis =
    latestRun?.analysis && typeof latestRun.analysis === "object"
      ? (latestRun.analysis as Prisma.JsonObject)
      : null;
  const latestObjective =
    analysis && typeof analysis.objective === "string"
      ? analysis.objective
      : null;
  const runsByStatus = Object.fromEntries(
    runStats.map((item) => [item.status, item._count._all])
  );
  const stats = [
    {
      label: "Usuários",
      value: userCount ? userCount.toLocaleString("pt-BR") : "—",
      trend: `${activeAdmins} administradores ativos`,
    },
    {
      label: "Runs",
      value: Object.values(runsByStatus).reduce((sum, count) => sum + count, 0).toLocaleString("pt-BR"),
      trend: `${runsByStatus.success ?? 0} sucesso / ${runsByStatus.failed ?? 0} falha`,
    },
    {
      label: "Projetos",
      value: projectCount ? projectCount.toLocaleString("pt-BR") : "—",
      trend: projectCount ? `${runsByStatus.running ?? 0} runs em andamento` : "Sem projetos",
    },
    {
      label: "Reviews",
      value: recentRuns.reviewedRuns.toLocaleString("pt-BR"),
      trend: `${recentRuns.approvalBlocks} aguardando aprovação`,
    },
    {
      label: "Runners",
      value: recentRuns.topRunners.length.toLocaleString("pt-BR"),
      trend: `${recentRuns.specializedRuns} runs com despacho especializado`,
    },
    {
      label: "Guards",
      value: recentRuns.topGuards.length.toLocaleString("pt-BR"),
      trend: `${recentRuns.governanceBlockedRuns} execuções travadas`,
    },
  ];

  return (
    <div className="space-y-10">
      <section className="glass-card space-y-6 p-8">
        <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
          Painel geral
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Visão rápida da plataforma
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Mantenha o controle sobre usuários, receitas e projetos ativos. Todo
          run disparado pelo agente fica registrado abaixo.
          {latestObjective ? (
            <span className="block mt-2 text-xs text-slate-400">
              Último objetivo registrado: {latestObjective}
            </span>
          ) : null}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-6">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card flex min-h-[160px] flex-col justify-between gap-3 p-5">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-white break-words">
                {stat.value ?? "—"}
              </p>
              <p className="mt-1 text-sm text-slate-400">{stat.trend}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="glass-card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Top runners
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Execução especializada
              </h2>
            </div>
            <a
              href="/dashboard/runs?type=agent&signal=all&runner=all&guard=all"
              className="rounded-full border border-white/20 px-3 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-white transition hover:border-white/50"
            >
              Abrir runs
            </a>
          </div>
          {recentRuns.topRunners.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/40 p-4 text-sm text-slate-400">
              Nenhum runner especializado registrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {recentRuns.topRunners.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{item.name}</span>
                    <span className="text-xs uppercase tracking-[0.3em] text-indigo-200">
                      {item.count} fase(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Guards
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Políticas mais acionadas
              </h2>
            </div>
            <a
              href={`/dashboard/runs?type=agent&signal=all&runner=all&guard=${encodeURIComponent(
                recentRuns.topGuards[0]?.name ?? "all"
              )}`}
              className="rounded-full border border-white/20 px-3 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-white transition hover:border-white/50"
            >
              Ver guard
            </a>
          </div>
          {recentRuns.topGuards.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/40 p-4 text-sm text-slate-400">
              Nenhuma política operacional foi acionada.
            </p>
          ) : (
            <div className="space-y-3">
              {recentRuns.topGuards.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{item.name}</span>
                    <span className="text-xs uppercase tracking-[0.3em] text-fuchsia-200">
                      {item.count} acionamento(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Governança
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Bloqueios e revisão
            </h2>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-amber-200">
                Aprovação bloqueada
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{recentRuns.approvalBlocks}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-rose-200">
                Execução travada
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{recentRuns.governanceBlockedRuns}</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-cyan-200">
                Runs revisados
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{recentRuns.reviewedRuns}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Novas execuções
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Acompanhe os runs lançados pelo agente
            </h2>
          </div>
          <a
            href="/dashboard/runs"
            className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white transition hover:border-white/60"
          >
            Ver histórico
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-300 break-words">
          O painel agora reflete o banco real de runs. Use o histórico para
          investigar fases, falhas e duração de execução.
        </p>
      </section>

      <section className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_30px_80px_rgba(2,6,23,0.7)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Últimas exclusões
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Auditoria de deleções
            </h2>
          </div>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
            registros: {recentDeletions.length}
          </span>
        </div>
        {recentDeletions.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-white/30 bg-slate-950/60 p-4 text-sm text-slate-400">
            Nenhuma ação registrada ainda.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-slate-200">
            {recentDeletions.map((audit) => (
              <li
                key={audit.id}
                className="space-y-1 rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
                    {audit.targetType === "user" ? "Usuário" : "Projeto"}
                  </span>
                  <span className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                    {new Date(audit.deletedAt).toLocaleString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-base font-semibold text-white">
                  {audit.targetType === "user"
                    ? audit.userEmail ?? "Usuário anônimo"
                    : audit.projectSlug ?? "Projeto removido"}
                </p>
                <p className="text-sm text-slate-400">
                  {audit.reason ?? "Sem descrição"}
                </p>
                <p className="text-[0.7rem] text-slate-500">
                  Removido por {audit.performedBy}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
