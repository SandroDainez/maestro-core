import Link from "next/link";
import DeleteProjectButton from "../components/DeleteProjectButton";
import RunActions from "../components/RunActions";
import ApproveExecutionButton from "../../governance/components/ApproveExecutionButton";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

const statusStyles: Record<string, string> = {
  success: "bg-emerald-400 text-emerald-200",
  failed: "bg-rose-400 text-rose-200",
  running: "bg-sky-400 text-sky-200",
  queued: "bg-slate-400 text-slate-200",
};

interface PhaseRun {
  id: string;
  phase: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  logs: Prisma.JsonValue | null;
  error: string | null;
  details?: string | null;
  outputs?: Prisma.JsonValue | null;
}

interface PhaseAnalysis {
  phase: string;
  details?: string;
}

interface WorkflowStage {
  code: string;
  status: string;
  note?: string;
}

interface MultiAgentReview {
  summary?: string;
  recommendations?: string[];
  flaggedPhases?: string[];
  participants?: string[];
  phaseReviews?: Array<{
    phase: string;
    agents: string[];
    verdict: "ok" | "attention" | "blocked";
    ownerAgent?: string;
    executionMode?: string;
    notes: string[];
  }>;
}

interface Run {
  id: string;
  type: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  project?: { name: string | null; path: string; slug: string };
  phaseRuns?: PhaseRun[] | null;
  analysis?: Prisma.JsonValue | null;
}

interface ObservabilityTraceNode {
  id: string;
  phase?: string;
  agent?: string;
  status?: string;
  dependencies?: string[];
}

export const dynamic = "force-dynamic";

async function getRun(id: string): Promise<Run | null> {
  try {
    return await prisma.pipelineRun.findUnique({
      where: { id },
      include: {
        project: true,
        phaseRuns: {
          orderBy: { startedAt: "asc" },
        },
      },
    });
  } catch {
    return null;
  }
}

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLogs(value: Prisma.JsonValue | null) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeOutputs(value: Prisma.JsonValue | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseOutputMeta(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  return {
    ownerAgent:
      typeof record.ownerAgent === "string" ? record.ownerAgent : null,
    executionMode:
      typeof record.executionMode === "string" ? record.executionMode : null,
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
    runner: typeof operational.runner === "string" ? operational.runner : "planned",
    source: typeof operational.source === "string" ? operational.source : "planned",
    guards: Array.isArray(operational.guards)
      ? operational.guards.map((item) => String(item))
      : [],
  };
}

function normalizeLogLines(value: Prisma.JsonValue | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") return [value];
  return [];
}

function parseOperationalMeta(logs: Prisma.JsonValue | null | undefined) {
  const lines = normalizeLogLines(logs);
  const dispatch = lines.find((line) => line.startsWith("dispatch:"));
  const guards = lines
    .filter((line) => line.startsWith("guard:"))
    .map((line) => line.split(":")[1])
    .filter(Boolean);

  const [, runner = "planned", source = "planned"] = dispatch?.split(":") ?? [];

  if (!dispatch && guards.length === 0) {
    return null;
  }

  return {
    runner,
    source,
    guards: Array.from(new Set(guards)),
  };
}

function toTitleCase(value: string) {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function RunDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const run = await getRun(params.id);

  if (!run) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_30px_80px_rgba(2,6,23,0.7)]">
          <p className="text-sm uppercase tracking-[0.5em] text-slate-400">
            Execução não encontrada
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            Run ID inexistente
          </h1>
          <Link
            href="/dashboard/runs"
            className="mt-6 inline-flex rounded-full border border-indigo-400/60 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-indigo-100 transition hover:border-indigo-200 hover:text-white"
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  const phases = run.phaseRuns ?? [];
  const analysis =
    run.analysis && typeof run.analysis === "object"
      ? (run.analysis as {
          objective?: string;
          phases?: PhaseAnalysis[];
          workflow?: WorkflowStage[];
          observability?: {
            trace?: {
              planId?: string;
              planVersion?: number;
              nodes?: ObservabilityTraceNode[];
              edges?: Array<{ from?: string; to?: string }>;
              events?: Array<Record<string, unknown>>;
              decisionPath?: Array<Record<string, unknown>>;
            };
            metrics?: {
              successRate?: number;
              planScore?: number;
              executionScore?: number;
              agentPerformance?: Array<{
                agent?: string;
                successRate?: number;
                totalSteps?: number;
              }>;
            };
            replanning?: {
              count?: number;
              events?: Array<Record<string, unknown>>;
              finalPlanId?: string;
              finalPlanVersion?: number;
            };
            control?: {
              replanningEnabled?: boolean;
              maxReplans?: number;
              evaluationScoreThreshold?: number;
              outputQualityThreshold?: number;
              toolFailureRateThreshold?: number;
              maxSteps?: number;
              allowedPhases?: string[];
            };
          };
          audit?: {
            decisions?: Array<Record<string, unknown>>;
            planVersions?: Array<{ planId?: string | null; planVersion?: number | null }>;
          };
          multiAgentReview?: MultiAgentReview;
          blockedPhases?: string[];
          approvedPhases?: string[];
          governance?: {
            highRiskCount?: number;
            mediumRiskCount?: number;
            requiresHumanApproval?: boolean;
          };
        })
      : null;
  const objective = analysis?.objective ?? "Objetivo não informado";
  const typeLabel = run.type === "agent" ? "Maestro IA" : run.type === "autopilot" ? "Autopilot" : "Execução";
  const projectLabel = run.project?.name ?? run.project?.path ?? "Projeto desconhecido";

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-slate-400">
          <Link
            href="/dashboard/runs"
            className="rounded-full border border-white/20 px-4 py-1 text-white transition hover:border-white/60"
          >
            ← Voltar à lista
          </Link>
          <span>|</span>
          <span>Detalhes da execução</span>
        </div>

        <section className="relative rounded-[40px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-900/60 p-8 shadow-[0_40px_90px_rgba(2,6,23,0.85)]">
          <div className="absolute inset-4 rounded-[36px] bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.25),_transparent_45%)] opacity-60" />
          <div className="relative space-y-6">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
                Run ID
              </p>
              <h1 className="text-3xl font-semibold text-white">{run.id}</h1>
              <p className="text-sm text-slate-300">
                {typeLabel} • {projectLabel} • Status
                <span className="font-semibold text-white"> {run.status}</span>
              </p>
              <p className="text-xs text-slate-400">
                Objetivo: {objective}
              </p>
            </div>

            <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">
                  Início
                </p>
                <p className="mt-1 text-base text-white">
                  {formatDate(run.startedAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">
                  Finalizado
                </p>
                <p className="mt-1 text-base text-white">
                  {run.finishedAt ? formatDate(run.finishedAt) : "Em execução"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <RunActions objective={analysis?.objective ?? null} />

        {(analysis?.observability || analysis?.audit) ? (
          <section className="space-y-5 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_80px_rgba(2,6,23,0.8)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Observabilidade e controle</h2>
              <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
                runtime
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  label: "Success rate",
                  value:
                    typeof analysis?.observability?.metrics?.successRate === "number"
                      ? `${Math.round(analysis.observability.metrics.successRate * 100)}%`
                      : "—",
                },
                {
                  label: "Plan score",
                  value:
                    typeof analysis?.observability?.metrics?.planScore === "number"
                      ? analysis.observability.metrics.planScore.toFixed(3)
                      : "—",
                },
                {
                  label: "Execution score",
                  value:
                    typeof analysis?.observability?.metrics?.executionScore === "number"
                      ? analysis.observability.metrics.executionScore.toFixed(3)
                      : "—",
                },
                {
                  label: "Replans",
                  value: String(analysis?.observability?.replanning?.count ?? 0),
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
                  DAG e fases
                </p>
                <div className="mt-3 space-y-3">
                  {(analysis?.observability?.trace?.nodes ?? []).map((node) => (
                    <div
                      key={node.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{node.id}</span>
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          {node.status ?? "unknown"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">
                        {node.phase ?? "phase"} · {node.agent ?? "agent"}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        deps: {(node.dependencies ?? []).join(", ") || "none"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
                  Decisão e replanning
                </p>
                <div className="mt-3 space-y-3">
                  {[
                    ...(analysis?.observability?.trace?.decisionPath ?? []),
                    ...(analysis?.observability?.replanning?.events ?? []),
                  ].map((item, index) => (
                    <pre
                      key={index}
                      className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300"
                    >
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
                  Controle aplicado
                </p>
                <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                  {JSON.stringify(analysis?.observability?.control ?? {}, null, 2)}
                </pre>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
                  Auditoria
                </p>
                <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                  {JSON.stringify(
                    {
                      planVersions: analysis?.audit?.planVersions ?? [],
                      decisions: analysis?.audit?.decisions ?? [],
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </section>
        ) : null}

        {run.project?.path ? (
          <ApproveExecutionButton
            projectPath={run.project.path}
            blockedPhases={
              analysis?.multiAgentReview?.phaseReviews
                ?.filter((phase) => phase.verdict === "blocked")
                .map((phase) => phase.phase) ?? []
            }
          />
        ) : null}

        <DeleteProjectButton projectSlug={run.project?.slug ?? null} />

        {(analysis?.multiAgentReview || analysis?.workflow?.length) ? (
          <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_80px_rgba(2,6,23,0.8)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Review e workflow</h2>
              <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
                governança
              </span>
            </div>

            {analysis?.multiAgentReview ? (
              <div className="space-y-4 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-cyan-200">
                    Resumo
                  </p>
                  <p className="mt-2 text-sm text-cyan-50">
                    {analysis.multiAgentReview.summary ?? "Sem resumo de revisão"}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.4em] text-cyan-200">
                      Agentes
                    </p>
                    <p className="mt-2 text-sm text-cyan-50">
                      {(analysis.multiAgentReview.participants ?? []).join(", ") || "Sem agentes"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.4em] text-cyan-200">
                      Fases sinalizadas
                    </p>
                    <p className="mt-2 text-sm text-cyan-50">
                      {(analysis.multiAgentReview.flaggedPhases ?? []).join(", ") || "Nenhuma"}
                    </p>
                  </div>
                </div>
                {(analysis.multiAgentReview.recommendations ?? []).length ? (
                  <ul className="space-y-2 text-sm text-cyan-50">
                    {analysis.multiAgentReview.recommendations?.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {(analysis?.multiAgentReview?.phaseReviews ?? []).length ? (
              <div className="space-y-3">
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
                  Parecer por fase
                </p>
                {analysis.multiAgentReview?.phaseReviews?.map((phaseReview) => (
                  <div
                    key={phaseReview.phase}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[0.7rem] uppercase tracking-[0.4em] text-cyan-200">
                        {phaseReview.phase}
                      </span>
                      <span className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400">
                        {phaseReview.verdict}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {phaseReview.agents.join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Owner: {phaseReview.ownerAgent ?? "Maestro-Orchestrator"} · Mode:{" "}
                      {phaseReview.executionMode ?? "standard"}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {phaseReview.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}

            {(analysis?.approvedPhases?.length || analysis?.blockedPhases?.length) ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-emerald-200">
                    Fases aprovadas
                  </p>
                  <p className="mt-2 text-sm text-emerald-50">
                    {analysis?.approvedPhases?.length
                      ? analysis.approvedPhases.join(", ")
                      : "Nenhuma fase aprovada manualmente."}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-amber-200">
                    Fases bloqueadas
                  </p>
                  <p className="mt-2 text-sm text-amber-50">
                    {analysis?.blockedPhases?.length
                      ? analysis.blockedPhases.join(", ")
                      : "Nenhuma fase bloqueada pendente."}
                  </p>
                </div>
              </div>
            ) : null}

            {analysis?.workflow?.length ? (
              <div className="space-y-3">
                {analysis.workflow.map((stage) => (
                  <div
                    key={stage.code}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.7rem] uppercase tracking-[0.4em] text-indigo-200">
                        {stage.code}
                      </span>
                      <span className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-400">
                        {stage.status}
                      </span>
                    </div>
                    {stage.note ? (
                      <p className="mt-2 text-sm text-slate-300">{stage.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_80px_rgba(2,6,23,0.8)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Fases</h2>
            <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
              estado
            </span>
          </div>

          {!phases.length && (
            <p className="rounded-2xl border border-dashed border-white/30 bg-slate-900/60 p-6 text-sm text-slate-400">
              Nenhuma fase registrada para esta execução.
            </p>
          )}

          <div className="space-y-4">
          {phases.map((phase, index) => {
            const outputs = normalizeOutputs(phase.outputs);
            const outputMeta = parseOutputMeta(phase.outputs);
            const operationalMeta =
              parseOperationalMetaFromOutputs(phase.outputs) ??
              parseOperationalMeta(phase.logs);
            return (
              <article
                key={phase.id}
                className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-[0_25px_60px_rgba(2,6,23,0.8)] sm:flex-row"
              >
                <div className="relative flex flex-row items-start gap-2 sm:flex-col">
                  <span
                    className={`h-3 w-3 rounded-full border ${statusStyles[phase.status]?.replace(
                      "text-",
                      "border-"
                    ) ?? "border-slate-400"} ${
                      statusStyles[phase.status] ?? statusStyles.queued
                    }`}
                  />
                  {index < phases.length - 1 && (
                    <span className="h-full w-px bg-white/10" />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">
                      {toTitleCase(phase.phase)}
                    </h3>
                    <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
                      {phase.status}
                    </span>
                  </div>

                  <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                    <div>
                      <p className="text-[0.55rem] uppercase tracking-[0.4em] text-slate-500">Início</p>
                      <p className="text-sm text-white">{formatDate(phase.startedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[0.55rem] uppercase tracking-[0.4em] text-slate-500">Fim</p>
                      <p className="text-sm text-white">
                        {phase.finishedAt ? formatDate(phase.finishedAt) : "—"}
                      </p>
                    </div>
                  </div>

                  {(phase.error || phase.logs) && (
                    <pre className="max-h-48 min-w-0 overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-200 whitespace-pre-wrap break-words">
                      {phase.error ?? formatLogs(phase.logs)}
                    </pre>
                  )}
                  {phase.details && (
                    <p className="text-sm text-slate-300">{phase.details}</p>
                  )}
                  {operationalMeta ? (
                    <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-3 text-xs text-indigo-100">
                      <p className="uppercase tracking-[0.35em] text-indigo-200">
                        Execução operacional
                      </p>
                      <p className="mt-2">
                        runner: {operationalMeta.runner} · origem: {operationalMeta.source}
                      </p>
                      <p className="mt-1">
                        políticas:{" "}
                        {operationalMeta.guards.length
                          ? operationalMeta.guards.join(", ")
                          : "nenhuma"}
                      </p>
                    </div>
                  ) : null}
                  {outputMeta?.ownerAgent || outputMeta?.executionMode ? (
                    <p className="text-xs text-slate-500">
                      owner: {outputMeta.ownerAgent ?? "Maestro-Orchestrator"} · mode:{" "}
                      {outputMeta.executionMode ?? "standard"}
                    </p>
                  ) : null}
                  {outputs.length > 0 && (
                    <div className="space-y-1 text-sm text-slate-300">
                      <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
                        Artefatos
                      </p>
                      <ul className="space-y-1 text-[0.75rem] text-slate-200">
                        {outputs.map((output) => (
                          <li key={output}>
                            <a
                              href={`/api/agent/outputs/${run.id}?file=${encodeURIComponent(
                                output
                              )}`}
                              className="text-sky-300"
                            >
                              {output}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
            </article>
          );
        })}
          </div>
        </section>
      </div>
    </div>
  );
}
