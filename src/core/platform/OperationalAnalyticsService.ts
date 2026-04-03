import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

type PhaseOperationalMeta = {
  phase?: string;
  runner: string;
  source: string;
  guards: string[];
  status?: string;
};

type RunAnalysis = {
  workflow?: Array<{ code?: string; status?: string }>;
  multiAgentReview?: unknown;
  governance?: {
    requiresHumanApproval?: boolean;
    highRiskCount?: number;
  };
  operationalSummary?: {
    runners?: string[];
    guards?: string[];
    specializedCount?: number;
    blockedCount?: number;
    phases?: Array<{
      phase?: string;
      runner?: string;
      source?: string;
      guards?: string[];
    }>;
  };
  observability?: {
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
      events?: Array<{ reasonType?: string }>;
    };
    trace?: {
      decisionPath?: Array<{ type?: string }>;
    };
    control?: {
      replanningEnabled?: boolean;
    };
  };
  audit?: {
    decisions?: Array<{ type?: string }>;
    planVersions?: Array<{ planId?: string; planVersion?: number }>;
    evaluations?: {
      execution?: { score?: number };
    };
  };
};

type AnalyticsRun = {
  analysis?: Prisma.JsonValue | null;
  startedAt?: Date;
  phaseRuns: Array<{
    logs?: Prisma.JsonValue | null;
    outputs?: Prisma.JsonValue | null;
  }>;
};

type StructuredOperationalPhase = {
  phase?: string;
  runner?: string;
  source?: string;
  guards?: string[];
  status?: string;
};

export type OperationalAnalyticsSummary = {
  windowSize: number;
  days: number;
  filters: {
    type?: string;
    runner?: string;
    guard?: string;
  };
  totalRuns: number;
  reviewedRuns: number;
  approvalBlocks: number;
  governanceBlockedRuns: number;
  specializedRuns: number;
  successRate: number;
  averagePlanScore: number;
  averageExecutionScore: number;
  replannedRuns: number;
  planVersionsTracked: number;
  topAgents: Array<{ name: string; count: number; avgSuccessRate: number }>;
  topRunners: Array<{ name: string; count: number }>;
  topGuards: Array<{ name: string; count: number }>;
  timeline: Array<{
    day: string;
    runs: number;
    reviews: number;
    approvalBlocks: number;
    specializedRuns: number;
  }>;
  periodComparison: {
    current: {
      runs: number;
      reviews: number;
      approvalBlocks: number;
      specializedRuns: number;
    };
    previous: {
      runs: number;
      reviews: number;
      approvalBlocks: number;
      specializedRuns: number;
    };
    delta: {
      runs: number;
      reviews: number;
      approvalBlocks: number;
      specializedRuns: number;
    };
  };
  phaseImpact: Array<{
    phase: string;
    runner: string;
    guard: string;
    totalRuns: number;
    blockedRuns: number;
  }>;
};

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
    status: undefined,
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
      status: typeof operational.status === "string" ? operational.status : undefined,
    };
  }

function countLabels(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function topEntries(values: string[], limit = 4) {
  return Object.entries(countLabels(values))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Number(
    (values.reduce((total, value) => total + value, 0) / values.length).toFixed(3)
  );
}

function buildTopAgents(runs: AnalyticsRun[], limit = 4) {
  const stats = new Map<string, { count: number; successRates: number[] }>();

  for (const run of runs) {
    const analysis = parseAnalysis(run.analysis);
    const agents = analysis?.observability?.metrics?.agentPerformance ?? [];
    for (const item of agents) {
      const name = typeof item.agent === "string" ? item.agent : null;
      if (!name) continue;
      const current = stats.get(name) ?? { count: 0, successRates: [] };
      current.count += 1;
      if (typeof item.successRate === "number") {
        current.successRates.push(item.successRate);
      }
      stats.set(name, current);
    }
  }

  return Array.from(stats.entries())
    .map(([name, item]) => ({
      name,
      count: item.count,
      avgSuccessRate: average(item.successRates),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function parseAnalysis(analysis: Prisma.JsonValue | null | undefined) {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    return null;
  }

  return analysis as unknown as RunAnalysis;
}

function formatDay(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

function buildTimeline(runs: AnalyticsRun[]) {
  const buckets = new Map<
    string,
    {
      day: string;
      runs: number;
      reviews: number;
      approvalBlocks: number;
      specializedRuns: number;
    }
  >();

  for (const run of runs) {
    const day = formatDay(run.startedAt ?? new Date());
    const current =
      buckets.get(day) ??
      {
        day,
        runs: 0,
        reviews: 0,
        approvalBlocks: 0,
        specializedRuns: 0,
      };
    const analysis = parseAnalysis(run.analysis);
    const workflow = analysis?.workflow ?? [];
    const reviewed = Boolean(analysis?.multiAgentReview);
    const approvalBlocked = workflow.some(
      (stage) => stage?.code === "approval" && stage?.status === "blocked"
    );
    const specialized =
      typeof analysis?.operationalSummary?.specializedCount === "number"
        ? analysis.operationalSummary.specializedCount > 0
        : derivePhaseMeta(run).some((phase) => phase.source === "specialized");

    current.runs += 1;
    current.reviews += reviewed ? 1 : 0;
    current.approvalBlocks += approvalBlocked ? 1 : 0;
    current.specializedRuns += specialized ? 1 : 0;
    buckets.set(day, current);
  }

  return Array.from(buckets.values()).sort((a, b) => a.day.localeCompare(b.day));
}

function buildPeriodComparison(
  timeline: OperationalAnalyticsSummary["timeline"],
  periodSize = 7
) {
  const current = timeline.slice(-periodSize);
  const previous = timeline.slice(Math.max(0, timeline.length - periodSize * 2), Math.max(0, timeline.length - periodSize));

  const sum = (items: OperationalAnalyticsSummary["timeline"]) =>
    items.reduce(
      (acc, item) => {
        acc.runs += item.runs;
        acc.reviews += item.reviews;
        acc.approvalBlocks += item.approvalBlocks;
        acc.specializedRuns += item.specializedRuns;
        return acc;
      },
      { runs: 0, reviews: 0, approvalBlocks: 0, specializedRuns: 0 }
    );

  const currentSum = sum(current);
  const previousSum = sum(previous);

  return {
    current: currentSum,
    previous: previousSum,
    delta: {
      runs: currentSum.runs - previousSum.runs,
      reviews: currentSum.reviews - previousSum.reviews,
      approvalBlocks: currentSum.approvalBlocks - previousSum.approvalBlocks,
      specializedRuns: currentSum.specializedRuns - previousSum.specializedRuns,
    },
  };
}

function buildPhaseImpact(allPhaseMeta: PhaseOperationalMeta[]) {
  const map = new Map<
    string,
    {
      phase: string;
      runner: string;
      guard: string;
      totalRuns: number;
      blockedRuns: number;
    }
  >();

  for (const phase of allPhaseMeta) {
    const guardName = phase.guards[0] ?? "none";
    const key = `${phase.phase ?? "unknown"}::${phase.runner}::${guardName}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        phase: phase.phase ?? "unknown",
        runner: phase.runner,
        guard: guardName,
        totalRuns: 1,
        blockedRuns: phase.status === "failed" ? 1 : 0,
      });
    } else {
      existing.totalRuns += 1;
      if (phase.status === "failed") {
        existing.blockedRuns += 1;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.blockedRuns - a.blockedRuns);
}

function derivePhaseMeta(run: AnalyticsRun): PhaseOperationalMeta[] {
  const analysis = parseAnalysis(run.analysis);
  const structuredPhases = Array.isArray(analysis?.operationalSummary?.phases)
    ? (analysis.operationalSummary.phases.filter(Boolean) as StructuredOperationalPhase[]).map(
        (item) =>
          ({
            phase: item.phase,
            runner: item.runner ?? "unknown",
            source: item.source ?? "planned",
            guards: Array.isArray(item.guards)
              ? item.guards.map((guard: string) => String(guard))
              : [],
            status: item.status,
          }) satisfies PhaseOperationalMeta
      )
    : [];

  if (structuredPhases.length > 0) {
    return structuredPhases;
  }

  return (run.phaseRuns
    .map((phase) => parseOperationalMetaFromOutputs(phase.outputs) ?? parsePhaseOperationalMeta(phase.logs))
    .filter(Boolean) as PhaseOperationalMeta[]);
}

export function buildOperationalAnalytics(
  runs: AnalyticsRun[],
  limit = runs.length,
  periodSize = 7,
  filters?: OperationalAnalyticsSummary["filters"],
  days = 30
): OperationalAnalyticsSummary {
  const reviewedRuns = runs.filter((run) => Boolean(parseAnalysis(run.analysis)?.multiAgentReview)).length;
  const approvalBlocks = runs.filter((run) => {
    const workflow = parseAnalysis(run.analysis)?.workflow ?? [];
    return workflow.some((stage) => stage?.code === "approval" && stage?.status === "blocked");
  }).length;
  const governanceBlockedRuns = runs.filter((run) => {
    const workflow = parseAnalysis(run.analysis)?.workflow ?? [];
    return workflow.some((stage) => stage?.code === "execute" && stage?.status === "blocked");
  }).length;
  const specializedRuns = runs.filter((run) => {
    const analysis = parseAnalysis(run.analysis);
    if (typeof analysis?.operationalSummary?.specializedCount === "number") {
      return analysis.operationalSummary.specializedCount > 0;
    }

    return derivePhaseMeta(run).some((phase) => phase.source === "specialized");
  }).length;
  const successfulRuns = runs.filter((run) => {
    const analysis = parseAnalysis(run.analysis);
    const explicitSuccessRate = analysis?.observability?.metrics?.successRate;
    if (typeof explicitSuccessRate === "number") {
      return explicitSuccessRate >= 1;
    }
    const phases = derivePhaseMeta(run);
    return phases.length === 0 ? true : phases.every((phase) => phase.status !== "failed");
  }).length;
  const planScores = runs
    .map((run) => parseAnalysis(run.analysis)?.observability?.metrics?.planScore)
    .filter((value): value is number => typeof value === "number");
  const executionScores = runs
    .map(
      (run) =>
        parseAnalysis(run.analysis)?.observability?.metrics?.executionScore ??
        parseAnalysis(run.analysis)?.audit?.evaluations?.execution?.score
    )
    .filter((value): value is number => typeof value === "number");
  const replannedRuns = runs.filter(
    (run) => (parseAnalysis(run.analysis)?.observability?.replanning?.count ?? 0) > 0
  ).length;
  const planVersionsTracked = runs.reduce(
    (total, run) =>
      total + (parseAnalysis(run.analysis)?.audit?.planVersions?.length ?? 0),
    0
  );
  const allPhaseMeta = runs.flatMap((run) => derivePhaseMeta(run));
  const timeline = buildTimeline(runs);

  return {
    windowSize: limit,
    days,
    filters: filters ?? {},
    totalRuns: runs.length,
    reviewedRuns,
    approvalBlocks,
    governanceBlockedRuns,
    specializedRuns,
    successRate: runs.length === 0 ? 0 : Number((successfulRuns / runs.length).toFixed(3)),
    averagePlanScore: average(planScores),
    averageExecutionScore: average(executionScores),
    replannedRuns,
    planVersionsTracked,
    topAgents: buildTopAgents(runs),
    topRunners: topEntries(allPhaseMeta.map((item) => item.runner)),
    topGuards: topEntries(allPhaseMeta.flatMap((item) => item.guards)),
    timeline,
    periodComparison: buildPeriodComparison(timeline, periodSize),
    phaseImpact: buildPhaseImpact(allPhaseMeta),
  };
}

export class OperationalAnalyticsService {
  async getSummary(input?: {
    limit?: number;
    type?: string;
    days?: number;
    runner?: string;
    guard?: string;
  }) {
    const limit = Math.min(Math.max(input?.limit ?? 30, 1), 100);
    const days = Math.min(Math.max(input?.days ?? 30, 1), 90);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days + 1);
    since.setUTCHours(0, 0, 0, 0);
    const rawRuns = await prisma.pipelineRun.findMany({
      take: limit,
      orderBy: { startedAt: "desc" },
      where: {
        ...(input?.type ? { type: input.type } : {}),
        startedAt: { gte: since },
      },
      select: {
        analysis: true,
        startedAt: true,
        phaseRuns: {
          select: {
            logs: true,
            outputs: true,
          },
        },
      },
    });

    const runs = rawRuns.filter((run) => {
      const phaseMeta = derivePhaseMeta(run);
      if (input?.runner && !phaseMeta.some((phase) => phase.runner === input.runner)) {
        return false;
      }
      if (input?.guard && !phaseMeta.some((phase) => phase.guards.includes(input.guard!))) {
        return false;
      }
      return true;
    });

    return {
      ...buildOperationalAnalytics(runs, limit, days, {
        type: input?.type,
        runner: input?.runner,
        guard: input?.guard,
      }),
      days,
    };
  }
}
