import type { Prisma } from "@prisma/client";
import Link from "next/link";
import RunArtifactsClient from "./components/RunArtifactsClient";
import ProjectDeleteSelector from "./components/ProjectDeleteSelector";
import { RunRepository } from "@/src/db/run.repository";

type PhaseRun = {
  id: string;
  phase: string;
  status: string;
  logs?: Prisma.JsonValue | null;
  outputs?: Prisma.JsonValue | null;
  error?: string | null;
};

type Run = {
  id: string;
  status: string;
  startedAt?: string | Date;
  finishedAt?: string | Date | null;
  type: string;
  project?: {
    name?: string | null;
  } | null;
  phaseRuns?: PhaseRun[] | null;
  analysis?: Prisma.JsonValue | null;
};

type RunAnalysis = {
  workflow?: Array<{ code: string; status: string }>;
  multiAgentReview?: { summary?: string };
  governance?: {
    requiresHumanApproval?: boolean;
    highRiskCount?: number;
  };
  blockedPhases?: string[];
  approvedPhases?: string[];
  operationalSummary?: {
    runners?: string[];
    guards?: string[];
    specializedCount?: number;
    phases?: Array<{
      phase?: string;
      runner?: string;
      source?: string;
      guards?: string[];
    }>;
  };
};

type PhaseOperationalMeta = {
  phase?: string;
  runner: string;
  source: string;
  guards: string[];
};

type RunOperationalMeta = {
  hasReview: boolean;
  approvalBlocked: boolean;
  hasHighRisk: boolean;
  workflowBlocked: boolean;
  approvedPhases: string[];
  blockedPhases: string[];
  specializedCount: number;
  runners: string[];
  guards: string[];
  phaseMeta: PhaseOperationalMeta[];
};

const statusStyles: Record<string, string> = {
  success: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  failed: "border-rose-400/40 bg-rose-500/10 text-rose-200",
  running: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  queued: "border-slate-400/40 bg-slate-500/10 text-slate-200",
};

export const dynamic = "force-dynamic";

const runRepo = new RunRepository();

async function getRuns(type?: string): Promise<Run[]> {
  try {
    return await runRepo.listRecentByType(type, 50);
  } catch {
    return [];
  }
}

function formatDate(date?: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toTitleCase(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeLogLines(value: Prisma.JsonValue | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") return [value];
  return [];
}

function parsePhaseOperationalMeta(logs: Prisma.JsonValue | null | undefined) {
  const lines = normalizeLogLines(logs);
  const dispatch = lines.find((line) => line.startsWith("dispatch:"));
  const guards = lines
    .filter((line) => line.startsWith("guard:"))
    .map((line) => line.split(":")[1])
    .filter(Boolean);

  if (!dispatch && guards.length === 0) {
    return null;
  }

  const [, runner = "unknown", source = "planned"] = dispatch?.split(":") ?? [];
  return {
    runner,
    source,
    guards: Array.from(new Set(guards)),
  };
}

function parseOperationalMetaFromOutputs(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const operational =
    record.operational && typeof record.operational === "object" && !Array.isArray(record.operational)
      ? (record.operational as Record<string, unknown>)
      : null;

  if (!operational) return null;

  return {
    phase: typeof operational.phase === "string" ? operational.phase : undefined,
    runner: typeof operational.runner === "string" ? operational.runner : "unknown",
    source: typeof operational.source === "string" ? operational.source : "planned",
    guards: Array.isArray(operational.guards)
      ? operational.guards.map((item) => String(item))
      : [],
  };
}

function parseRunOperationalMeta(run: Run): RunOperationalMeta {
  const analysis =
    run.analysis && typeof run.analysis === "object"
      ? (run.analysis as RunAnalysis)
      : null;
  const phaseMeta = (run.phaseRuns ?? [])
    .map((phase) =>
      parseOperationalMetaFromOutputs(
        (phase as unknown as { outputs?: Prisma.JsonValue | null }).outputs
      ) ?? parsePhaseOperationalMeta(phase.logs)
    )
    .filter((item): item is PhaseOperationalMeta => Boolean(item));

  const structuredSummary =
    analysis?.operationalSummary && typeof analysis.operationalSummary === "object"
      ? analysis.operationalSummary
      : null;

  const workflowBlocked =
    analysis?.workflow?.some((stage) => stage.status === "blocked") ?? false;
  const approvalBlocked = Boolean(
    analysis?.governance?.requiresHumanApproval === true ||
      analysis?.workflow?.some(
        (stage) => stage.code === "approval" && stage.status === "blocked"
      )
  );

  return {
    hasReview: Boolean(analysis?.multiAgentReview?.summary),
    approvalBlocked,
    hasHighRisk: (analysis?.governance?.highRiskCount ?? 0) > 0,
    workflowBlocked,
    approvedPhases: analysis?.approvedPhases ?? [],
    blockedPhases: analysis?.blockedPhases ?? [],
    specializedCount:
      typeof structuredSummary?.specializedCount === "number"
        ? structuredSummary.specializedCount
        : phaseMeta.filter((meta) => meta.source === "specialized").length,
    runners: Array.isArray(structuredSummary?.runners)
      ? structuredSummary.runners.map((item) => String(item))
      : Array.from(new Set(phaseMeta.map((meta) => meta.runner))),
    guards: Array.isArray(structuredSummary?.guards)
      ? structuredSummary.guards.map((item) => String(item))
      : Array.from(new Set(phaseMeta.flatMap((meta) => meta.guards))),
    phaseMeta,
  };
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams?: { type?: string; signal?: string; runner?: string; guard?: string };
}) {
  const filterType = searchParams?.type?.toLowerCase() ?? "agent";
  const signalFilter = searchParams?.signal?.toLowerCase() ?? "all";
  const runnerFilter = searchParams?.runner ?? "all";
  const guardFilter = searchParams?.guard ?? "all";
  const activeFilter = ["agent", "autopilot"].includes(filterType)
    ? filterType
    : "agent";
  const rawRuns = await getRuns(activeFilter === "all" ? undefined : activeFilter);
  const runsWithMeta = rawRuns.map((run) => ({
    run,
    meta: parseRunOperationalMeta(run),
  }));
  const availableRunners = Array.from(
    new Set(runsWithMeta.flatMap(({ meta }) => meta.runners))
  ).sort();
  const availableGuards = Array.from(
    new Set(runsWithMeta.flatMap(({ meta }) => meta.guards))
  ).sort();
  const runsWithActiveMeta = runsWithMeta.filter(({ meta }) => {
    if (signalFilter === "review" && !meta.hasReview) return false;
    if (signalFilter === "approval" && !meta.approvalBlocked) return false;
    if (signalFilter === "highrisk" && !meta.hasHighRisk) return false;
    if (signalFilter === "blocked" && !meta.workflowBlocked) return false;
    if (runnerFilter !== "all" && !meta.runners.includes(runnerFilter)) return false;
    if (guardFilter !== "all" && !meta.guards.includes(guardFilter)) return false;
    return true;
  });
  const runs = runsWithActiveMeta.map(({ run }) => run);

  const counts = {
    total: runs.length,
    success: runs.filter((run) => run.status === "success").length,
    failed: runs.filter((run) => run.status === "failed").length,
    running: runs.filter((run) => run.status === "running").length,
  };
  const reviewCount = runsWithActiveMeta.filter(({ meta }) => meta.hasReview).length;
  const approvalRequiredCount = runsWithActiveMeta.filter(
    ({ meta }) => meta.approvalBlocked
  ).length;
  const highRiskCount = runsWithActiveMeta.filter(({ meta }) => meta.hasHighRisk).length;

  const stats = [
    { label: "Total", value: counts.total, accent: "from-emerald-400/70 via-cyan-400/40 to-sky-500/60" },
    { label: "Concluídas", value: counts.success, accent: "from-emerald-500/60 via-lime-400/40 to-emerald-300/60" },
    { label: "Erros", value: counts.failed, accent: "from-rose-500/60 via-orange-400/30 to-rose-400/70" },
    { label: "Em andamento", value: counts.running, accent: "from-sky-500/60 via-blue-500/40 to-indigo-500/70" },
    { label: "Com review", value: reviewCount, accent: "from-cyan-400/60 via-teal-400/30 to-sky-500/60" },
    { label: "Aprovação", value: approvalRequiredCount, accent: "from-amber-400/60 via-orange-400/30 to-amber-500/60" },
    { label: "Risco alto", value: highRiskCount, accent: "from-rose-500/60 via-pink-500/30 to-red-500/60" },
  ];
  const typeFilters = [
    { label: "Agent", value: "agent" },
    { label: "Autopilot", value: "autopilot" },
  ];
  const signalFilters = [
    { label: "Todos", value: "all" },
    { label: "Review", value: "review" },
    { label: "Aprovação", value: "approval" },
    { label: "Risco alto", value: "highrisk" },
    { label: "Bloqueados", value: "blocked" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-900/80 px-6 pb-24 pt-16">
        <div className="pointer-events-none absolute inset-0 opacity-40 blur-[120px]">
          <div className="absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-400/40 to-indigo-500/60" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-fuchsia-600/60 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl space-y-6 text-slate-100">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Painel Maestro
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Fluxo de execuções em tempo real
          </h1>
          <p className="max-w-3xl text-base text-slate-300">
            Cada pipeline ganha camada extra de visibilidade: veja resultados
            recentes, embale squads com dados de sucesso e falhas, e navegue
            pelos runs persistidos com histórico completo de fases.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_70px_rgba(15,23,42,0.5)] backdrop-blur ${stat.accent}`}
              >
                <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-4 text-3xl font-semibold text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
              Execuções recentes
            </p>
            <h2 className="text-3xl font-semibold text-white">
              {runs.length} pipelines no histórico
            </h2>
          </div>
          <ProjectDeleteSelector />
          <Link
            href="/dashboard/runs"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold tracking-[0.3em] text-white opacity-90 transition hover:border-white/60 hover:opacity-100"
          >
            Atualizar
          </Link>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
              Tipo de pipeline
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {typeFilters.map((filter) => {
                const active = activeFilter === filter.value;
                return (
                  <Link
                    key={filter.value}
                    href={`/dashboard/runs?type=${filter.value}&signal=${signalFilter}`}
                    className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                      active
                        ? "border-cyan-300 bg-cyan-400/15 text-cyan-100"
                        : "border-white/15 text-slate-300 hover:border-white/40"
                    }`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
              Sinal operacional
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {signalFilters.map((filter) => {
                const active = signalFilter === filter.value;
                return (
                  <Link
                    key={filter.value}
                    href={`/dashboard/runs?type=${activeFilter}&signal=${filter.value}`}
                    className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                      active
                        ? "border-amber-300 bg-amber-400/15 text-amber-100"
                        : "border-white/15 text-slate-300 hover:border-white/40"
                    }`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
              Runner
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/runs?type=${activeFilter}&signal=${signalFilter}&runner=all&guard=${guardFilter}`}
                className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                  runnerFilter === "all"
                    ? "border-indigo-300 bg-indigo-400/15 text-indigo-100"
                    : "border-white/15 text-slate-300 hover:border-white/40"
                }`}
              >
                Todos
              </Link>
              {availableRunners.map((runner) => (
                <Link
                  key={runner}
                  href={`/dashboard/runs?type=${activeFilter}&signal=${signalFilter}&runner=${encodeURIComponent(
                    runner
                  )}&guard=${guardFilter}`}
                  className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                    runnerFilter === runner
                      ? "border-indigo-300 bg-indigo-400/15 text-indigo-100"
                      : "border-white/15 text-slate-300 hover:border-white/40"
                  }`}
                >
                  {runner}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
              Policy Guard
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/runs?type=${activeFilter}&signal=${signalFilter}&runner=${runnerFilter}&guard=all`}
                className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                  guardFilter === "all"
                    ? "border-fuchsia-300 bg-fuchsia-400/15 text-fuchsia-100"
                    : "border-white/15 text-slate-300 hover:border-white/40"
                }`}
              >
                Todos
              </Link>
              {availableGuards.map((guard) => (
                <Link
                  key={guard}
                  href={`/dashboard/runs?type=${activeFilter}&signal=${signalFilter}&runner=${runnerFilter}&guard=${encodeURIComponent(
                    guard
                  )}`}
                  className={`rounded-full border px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                    guardFilter === guard
                      ? "border-fuchsia-300 bg-fuchsia-400/15 text-fuchsia-100"
                      : "border-white/15 text-slate-300 hover:border-white/40"
                  }`}
                >
                  {guard}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
          Exibindo <span className="font-semibold text-white">{runs.length}</span> runs para
          o tipo <span className="font-semibold text-white"> {activeFilter}</span> com filtro
          <span className="font-semibold text-white"> {signalFilter}</span>, runner
          <span className="font-semibold text-white"> {runnerFilter}</span> e guard
          <span className="font-semibold text-white"> {guardFilter}</span>.
        </div>

        <div className="space-y-5">
          {runsWithActiveMeta.map(({ run, meta }) => {
            const status = run.status?.toLowerCase() ?? "queued";
            const analysis =
              run.analysis && typeof run.analysis === "object"
                ? (run.analysis as RunAnalysis)
                : null;
            return (
              <article
                key={run.id}
                className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/5 p-6 shadow-[0_30px_60px_rgba(2,6,23,0.7)] transition hover:-translate-y-1 hover:border-white/20"
              >
                <div className="absolute left-0 top-6 hidden h-12 w-12 rounded-full border border-white/10 bg-white/10 blur-[1px] sm:block" />

                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
                      {toTitleCase(run.id.slice(0, 8))}
                    </p>
                    <h3 className="text-2xl font-semibold text-white">
                      {run.project?.name ?? "Projeto desconhecido"}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {formatDate(run.startedAt)} —{" "}
                      {run.finishedAt ? formatDate(run.finishedAt) : "em andamento"}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 text-xs uppercase tracking-[0.4em] text-slate-400 lg:items-end">
                    <span
                      className={`rounded-full border px-4 py-1 text-[0.65rem] font-semibold uppercase ${statusStyles[status] ?? statusStyles.queued}`}
                    >
                      {status || "queued"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {run.id}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Iniciado</p>
                    <p className="mt-1 text-base text-white">{formatDate(run.startedAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Finalizado</p>
                    <p className="mt-1 text-base text-white">
                      {run.finishedAt ? formatDate(run.finishedAt) : "—"}
                    </p>
                  </div>
                </div>

                {analysis?.multiAgentReview?.summary ? (
                  <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                    <p className="text-[0.65rem] uppercase tracking-[0.4em] text-cyan-200">
                      Revisão multi-agente
                    </p>
                    <p className="mt-2">{analysis.multiAgentReview.summary}</p>
                  </div>
                ) : null}

                {analysis?.workflow?.length ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {analysis.workflow.map((stage) => (
                      <span
                        key={`${run.id}-${stage.code}`}
                        className="rounded-full border border-white/15 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-300"
                      >
                        {stage.code}: {stage.status}
                      </span>
                    ))}
                  </div>
                ) : null}

                {meta.approvalBlocked ? (
                  <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Esta execução ficou bloqueada aguardando aprovação humana.
                  </div>
                ) : null}

                {(meta.approvedPhases.length > 0 || meta.blockedPhases.length > 0) ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                      <p className="text-[0.65rem] uppercase tracking-[0.4em] text-emerald-200">
                        Fases aprovadas
                      </p>
                      <p className="mt-2">
                        {meta.approvedPhases.length
                          ? meta.approvedPhases.join(", ")
                          : "Nenhuma fase aprovada manualmente."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                      <p className="text-[0.65rem] uppercase tracking-[0.4em] text-amber-200">
                        Fases ainda bloqueadas
                      </p>
                      <p className="mt-2">
                        {meta.blockedPhases.length
                          ? meta.blockedPhases.join(", ")
                          : "Nenhuma fase bloqueada restante."}
                      </p>
                    </div>
                  </div>
                ) : null}

                {(meta.specializedCount > 0 || meta.guards.length > 0) ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm text-indigo-100">
                      <p className="text-[0.65rem] uppercase tracking-[0.4em] text-indigo-200">
                        Roteamento especializado
                      </p>
                      <p className="mt-2">
                        {meta.specializedCount} fase(s) executadas por runner dedicado.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100">
                      <p className="text-[0.65rem] uppercase tracking-[0.4em] text-fuchsia-200">
                        Políticas aplicadas
                      </p>
                      <p className="mt-2">
                        {meta.guards.length
                          ? meta.guards.join(", ")
                          : "Nenhum guardião aplicado."}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-white/60" />
                    Fases executadas
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {run.phaseRuns && run.phaseRuns.length ? (
                      run.phaseRuns.map((phase) => {
                        const phaseOperational =
                          parseOperationalMetaFromOutputs(phase.outputs) ??
                          parsePhaseOperationalMeta(phase.logs);
                        return (
                          <div
                            key={phase.id}
                            className={`rounded-2xl border px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] ${
                              phase.status === "success"
                                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                                : phase.status === "failed"
                                ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                                : "border-slate-400/40 bg-slate-500/10 text-slate-200"
                            }`}
                          >
                            <div>{phase.phase.replace(/-/g, " ")}</div>
                            {phaseOperational ? (
                              <div className="mt-1 text-[0.55rem] tracking-[0.25em] text-slate-300">
                                {phaseOperational.runner} · {phaseOperational.source}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <span className="rounded-2xl border border-white/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Sem fases registradas
                      </span>
                    )}
                    {run.phaseRuns && run.phaseRuns.some((phase) => phase.status === "failed") && (
                      <span className="rounded-2xl border border-rose-400/60 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-rose-200">
                        Falha detectada
                      </span>
                    )}
                  </div>
                </div>

                <RunArtifactsClient runId={run.id} />

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-white/60" />
                    Histórico
                  </div>
                  <Link
                    href={`/dashboard/runs/${run.id}`}
                    className="rounded-full border border-indigo-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200 transition hover:border-indigo-200 hover:text-white"
                  >
                    Ver detalhes →
                  </Link>
                </div>
              </article>
            );
          })}

          {!runs.length && (
            <div className="rounded-3xl border border-dashed border-white/30 bg-white/5 p-8 text-center text-sm text-slate-400">
              Nenhuma execução registrada ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
