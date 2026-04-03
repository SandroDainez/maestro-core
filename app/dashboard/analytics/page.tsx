import Link from "next/link";
import { OperationalAnalyticsService } from "@/src/core/platform/OperationalAnalyticsService";

export const dynamic = "force-dynamic";

const analyticsService = new OperationalAnalyticsService();
const dayOptions = [7, 14, 30] as const;

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function maxValue(values: number[]) {
  return Math.max(...values, 1);
}

function deltaLabel(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function compactDayLabel(value: string) {
  return value.slice(5);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: { days?: string; runner?: string; guard?: string };
}) {
  const rawDays = Number.parseInt(searchParams?.days ?? "", 10);
  const days = dayOptions.includes(rawDays as (typeof dayOptions)[number])
    ? (rawDays as (typeof dayOptions)[number])
    : 30;
  const runner = searchParams?.runner && searchParams.runner !== "all" ? searchParams.runner : undefined;
  const guard = searchParams?.guard && searchParams.guard !== "all" ? searchParams.guard : undefined;
  const [allRuns, agentRuns, autopilotRuns] = await Promise.all([
    analyticsService.getSummary({ limit: 40, days, runner, guard }),
    analyticsService.getSummary({ limit: 40, type: "agent", days, runner, guard }),
    analyticsService.getSummary({ limit: 40, type: "autopilot", days, runner, guard }),
  ]);
  const availableRunners = Array.from(
    new Set([
      ...allRuns.topRunners.map((item) => item.name),
      ...agentRuns.topRunners.map((item) => item.name),
      ...autopilotRuns.topRunners.map((item) => item.name),
    ])
  );
  const availableGuards = Array.from(
    new Set([
      ...allRuns.topGuards.map((item) => item.name),
      ...agentRuns.topGuards.map((item) => item.name),
      ...autopilotRuns.topGuards.map((item) => item.name),
    ])
  );

  const overviewCards = [
    {
      label: "Janela analisada",
      value: String(allRuns.windowSize),
      helper: `${allRuns.totalRuns} runs avaliados`,
    },
    {
      label: "Especializados",
      value: String(allRuns.specializedRuns),
      helper: `${percent(allRuns.specializedRuns, allRuns.totalRuns)}% da janela`,
    },
    {
      label: "Aprovação",
      value: String(allRuns.approvalBlocks),
      helper: `${allRuns.governanceBlockedRuns} execuções travadas`,
    },
    {
      label: "Reviews",
      value: String(allRuns.reviewedRuns),
      helper: `${percent(allRuns.reviewedRuns, allRuns.totalRuns)}% revisados`,
    },
    {
      label: "Success rate",
      value: `${Math.round(allRuns.successRate * 100)}%`,
      helper: "taxa consolidada por run",
    },
    {
      label: "Plan score",
      value: allRuns.averagePlanScore.toFixed(3),
      helper: "média do score de plano",
    },
    {
      label: "Execution score",
      value: allRuns.averageExecutionScore.toFixed(3),
      helper: "média do score de execução",
    },
    {
      label: "Replans",
      value: String(allRuns.replannedRuns),
      helper: `${allRuns.planVersionsTracked} versões rastreadas`,
    },
  ];

  const typeCards = [
    {
      label: "Agent",
      analytics: agentRuns,
      href: "/dashboard/runs?type=agent&signal=all&runner=all&guard=all",
    },
    {
      label: "Autopilot",
      analytics: autopilotRuns,
      href: "/dashboard/runs?type=autopilot&signal=all&runner=all&guard=all",
    },
  ];
  const exportBase = `/api/platform/analytics?days=${days}&limit=40${
    runner ? `&runner=${encodeURIComponent(runner)}` : ""
  }${guard ? `&guard=${encodeURIComponent(guard)}` : ""}`;
  const exportTypes = [
    { label: "All", suffix: "" },
    { label: "Agent", suffix: "&type=agent" },
    { label: "Autopilot", suffix: "&type=autopilot" },
  ];

  return (
    <div className="space-y-8 text-white">
      <section className="glass-card space-y-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/60 p-8 shadow-[0_35px_70px_rgba(2,6,23,0.8)]">
        <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
          Analytics
        </p>
        <h1 className="text-3xl font-semibold">Observabilidade operacional</h1>
        <p className="max-w-3xl text-sm text-slate-300">
          Esta área usa o resumo operacional persistido dos runs para destacar
          padrões de execução, pressão de governança e concentração de runners e guards.
        </p>
        <div className="grid gap-3 pt-1 md:grid-cols-3">
          {exportTypes.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">
                Export {item.label}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`${exportBase}${item.suffix}&format=json`}
                  className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:border-emerald-200"
                >
                  JSON
                </a>
                <a
                  href={`${exportBase}${item.suffix}&format=csv`}
                  className="rounded-full border border-amber-300/40 bg-amber-400/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-amber-100 transition hover:border-amber-200"
                >
                  CSV
                </a>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {dayOptions.map((option) => (
            <Link
              key={option}
              href={`/dashboard/analytics?days=${option}${runner ? `&runner=${encodeURIComponent(runner)}` : ""}${guard ? `&guard=${encodeURIComponent(guard)}` : ""}`}
              className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                days === option
                  ? "border-cyan-300 bg-cyan-400/15 text-cyan-100"
                  : "border-white/15 text-slate-300 hover:border-white/40"
              }`}
            >
              {option} dias
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/analytics?days=${days}&runner=all${guard ? `&guard=${encodeURIComponent(guard)}` : ""}`}
            className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
              !runner
                ? "border-indigo-300 bg-indigo-400/15 text-indigo-100"
                : "border-white/15 text-slate-300 hover:border-white/40"
            }`}
          >
            Todos runners
          </Link>
          {availableRunners.map((item) => (
            <Link
              key={item}
              href={`/dashboard/analytics?days=${days}&runner=${encodeURIComponent(item)}${guard ? `&guard=${encodeURIComponent(guard)}` : ""}`}
              className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                runner === item
                  ? "border-indigo-300 bg-indigo-400/15 text-indigo-100"
                  : "border-white/15 text-slate-300 hover:border-white/40"
              }`}
            >
              {item}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/analytics?days=${days}${runner ? `&runner=${encodeURIComponent(runner)}` : ""}&guard=all`}
            className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
              !guard
                ? "border-fuchsia-300 bg-fuchsia-400/15 text-fuchsia-100"
                : "border-white/15 text-slate-300 hover:border-white/40"
            }`}
          >
            Todos guards
          </Link>
          {availableGuards.map((item) => (
            <Link
              key={item}
              href={`/dashboard/analytics?days=${days}${runner ? `&runner=${encodeURIComponent(runner)}` : ""}&guard=${encodeURIComponent(item)}`}
              className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                guard === item
                  ? "border-fuchsia-300 bg-fuchsia-400/15 text-fuchsia-100"
                  : "border-white/15 text-slate-300 hover:border-white/40"
              }`}
            >
              {item}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <article
            key={card.label}
            className="glass-card rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_60px_rgba(2,6,23,0.5)]"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
            <p className="mt-2 text-sm text-slate-400">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: `Runs ${days}d`,
            current: allRuns.periodComparison.current.runs,
            previous: allRuns.periodComparison.previous.runs,
            delta: allRuns.periodComparison.delta.runs,
          },
          {
            label: `Reviews ${days}d`,
            current: allRuns.periodComparison.current.reviews,
            previous: allRuns.periodComparison.previous.reviews,
            delta: allRuns.periodComparison.delta.reviews,
          },
          {
            label: `Approval ${days}d`,
            current: allRuns.periodComparison.current.approvalBlocks,
            previous: allRuns.periodComparison.previous.approvalBlocks,
            delta: allRuns.periodComparison.delta.approvalBlocks,
          },
          {
            label: `Especializados ${days}d`,
            current: allRuns.periodComparison.current.specializedRuns,
            previous: allRuns.periodComparison.previous.specializedRuns,
            delta: allRuns.periodComparison.delta.specializedRuns,
          },
        ].map((card) => (
          <article
            key={card.label}
            className="glass-card rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_60px_rgba(2,6,23,0.5)]"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{card.current}</p>
            <p className="mt-2 text-sm text-slate-400">
              anterior: {card.previous} · delta: {deltaLabel(card.delta)}
            </p>
          </article>
        ))}
      </section>

      <section className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Timeline
            </p>
            <h2 className="text-2xl font-semibold text-white">Tendência por dia</h2>
          </div>
          <span className="text-xs uppercase tracking-[0.35em] text-slate-400">
            últimos {allRuns.days} dias
          </span>
        </div>
        {allRuns.timeline.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { key: "runs", label: "Runs", color: "from-cyan-400 to-blue-500" },
              { key: "reviews", label: "Reviews", color: "from-emerald-400 to-teal-500" },
              { key: "approvalBlocks", label: "Approval Blocks", color: "from-amber-400 to-orange-500" },
              { key: "specializedRuns", label: "Especializados", color: "from-fuchsia-400 to-rose-500" },
            ].map((series) => {
              const maxSeries = maxValue(
                allRuns.timeline.map((point) => Number(point[series.key as keyof typeof point] ?? 0))
              );
              return (
                <div key={series.key} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {series.label}
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    {allRuns.timeline.map((point) => {
                      const value = Number(point[series.key as keyof typeof point] ?? 0);
                      const height = Math.max(12, Math.round((value / maxSeries) * 120));
                      return (
                        <div key={`${series.key}-${point.day}`} className="flex flex-1 flex-col items-center gap-2">
                          <div
                            className={`w-full rounded-t-xl bg-gradient-to-t ${series.color}`}
                            style={{ height }}
                            title={`${point.day}: ${value}`}
                          />
                          <span className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-500">
                            {point.day.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-sm text-slate-400">
            Sem dados suficientes para montar a tendência temporal.
          </p>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {[
          {
            label: "Agent timeline",
            analytics: agentRuns,
            color: "from-cyan-400 to-blue-500",
          },
          {
            label: "Autopilot timeline",
            analytics: autopilotRuns,
            color: "from-emerald-400 to-teal-500",
          },
        ].map((series) => {
          const maxSeries = maxValue(series.analytics.timeline.map((point) => point.runs));
          return (
            <article
              key={series.label}
              className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                    Segmentado por tipo
                  </p>
                  <h2 className="text-2xl font-semibold text-white">{series.label}</h2>
                </div>
                <span className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  {series.analytics.totalRuns} runs
                </span>
              </div>
              {series.analytics.timeline.length ? (
                <div className="mt-6 flex items-end gap-2">
                  {series.analytics.timeline.map((point) => {
                    const height = Math.max(12, Math.round((point.runs / maxSeries) * 140));
                    return (
                      <div
                        key={`${series.label}-${point.day}`}
                        className="flex flex-1 flex-col items-center gap-2"
                      >
                        <div
                          className={`w-full rounded-t-xl bg-gradient-to-t ${series.color}`}
                          style={{ height }}
                          title={`${point.day}: ${point.runs} runs`}
                        />
                        <span className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-500">
                          {compactDayLabel(point.day)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-6 rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-sm text-slate-400">
                  Sem eventos suficientes para esta série.
                </p>
              )}
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Top runners
              </p>
              <h2 className="text-2xl font-semibold text-white">Distribuição por executor</h2>
            </div>
            <Link
              href="/dashboard/runs?type=agent&signal=all&runner=all&guard=all"
              
              className="rounded-full border border-white/20 px-4 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-white transition hover:border-white/50"
            >
              Abrir runs
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {allRuns.topRunners.length ? (
              allRuns.topRunners.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-white">{item.name}</span>
                    <span className="text-slate-400">{item.count} fase(s)</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-900/70">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400"
                      style={{ width: `${percent(item.count, Math.max(allRuns.totalRuns, 1))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-sm text-slate-400">
                Nenhum runner registrado na janela atual.
              </p>
            )}
          </div>
        </article>

        <article className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Guards
              </p>
              <h2 className="text-2xl font-semibold text-white">Pressão de política</h2>
            </div>
            <Link
              href={`/dashboard/runs?type=agent&signal=all&runner=all&guard=${encodeURIComponent(
                allRuns.topGuards[0]?.name ?? "all"
              )}`}
              className="rounded-full border border-white/20 px-4 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-white transition hover:border-white/50"
            >
              Filtrar guard
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {allRuns.topGuards.length ? (
              allRuns.topGuards.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-white">{item.name}</span>
                    <span className="text-slate-400">{item.count} acionamento(s)</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-900/70">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-fuchsia-400 to-rose-400"
                      style={{ width: `${percent(item.count, Math.max(allRuns.totalRuns, 1))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-sm text-slate-400">
                Nenhum guard foi acionado na janela atual.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {typeCards.map((card) => (
          <article
            key={card.label}
            className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  Tipo de pipeline
                </p>
                <h2 className="text-2xl font-semibold text-white">{card.label}</h2>
              </div>
              <Link
                href={card.href}
                className="rounded-full border border-white/20 px-4 py-2 text-[0.65rem] uppercase tracking-[0.35em] text-white transition hover:border-white/50"
              >
                Abrir histórico
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Runs</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.analytics.totalRuns}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Especializados</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.analytics.specializedRuns}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Approval blocks</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.analytics.approvalBlocks}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reviews</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.analytics.reviewedRuns}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Phase Impact
            </p>
            <h2 className="text-2xl font-semibold text-white">Ranking de fases</h2>
          </div>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
            ordenado por bloqueios
          </span>
        </div>
        {allRuns.phaseImpact.length ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-0 border-b border-white/5 bg-slate-900/70 px-4 py-3 text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
              <span>Phase</span>
              <span>Runner</span>
              <span>Guard</span>
              <span>Blocked</span>
            </div>
            <div className="divide-y divide-white/5">
              {allRuns.phaseImpact.slice(0, 8).map((item) => (
                <div
                  key={`${item.phase}-${item.runner}-${item.guard}`}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-0 px-4 py-3 text-sm text-slate-200"
                >
                  <span>{item.phase}</span>
                  <span>{item.runner}</span>
                  <span>{item.guard}</span>
                  <span className="font-semibold text-white">{item.blockedRuns}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-sm text-slate-400">
            Sem impacto de fases relevante neste recorte.
          </p>
        )}
      </section>
    </div>
  );
}
