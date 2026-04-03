import type {
  GeneratePlanOptions,
  PlannerModelPort,
} from "../../core/planning/ports/PlannerModelPort";
import type {
  Plan,
  PlanningContext,
  PlanStep,
} from "../../core/planning/types";
import { parsePlannerOutput } from "../../core/planning/planner-output.parser";
import {
  PlannerOutputTransportError,
  PlannerOutputValidationError,
} from "../../core/planning/planner-output.parser";
import { SUPPORTED_PLANNER_PHASES } from "../../core/planning/phase-catalog";
import {
  MaestroAction,
  MaestroJob,
  MaestroTask,
  PhaseRisk,
  TaskStatus,
} from "../../types";

type FetchLike = typeof fetch;

type OpenAIPlannerModelOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxRetries?: number;
  fetchImpl?: FetchLike;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class PlannerModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerModelError";
  }
}

export class OpenAIPlannerModel implements PlannerModelPort {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly temperature: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: OpenAIPlannerModelOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = options.model ?? process.env.OPENAI_PLANNER_MODEL ?? "gpt-4.1-mini";
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.temperature = options.temperature ?? 0.2;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generatePlan(
    context: PlanningContext,
    options: GeneratePlanOptions = {}
  ): Promise<Plan> {
    if (!this.apiKey) {
      throw new PlannerModelError("OPENAI_API_KEY is required for OpenAIPlannerModel.");
    }

    const prompt = this.buildPrompt(context, options);
    this.log("planner_prompt_input", {
      model: this.model,
      objective: context.objective,
      project: {
        id: context.project.id,
        name: context.project.name,
        currentPhase: context.project.currentPhase,
      },
      scan: context.scan,
      risks: context.risks.map((risk) => ({
        id: risk.id,
        risk: risk.risk,
        title: risk.title,
      })),
      memory: {
        recentProjects: context.memory.recentProjects,
        recentDecisionsCount: context.memory.recentDecisions.length,
        preferenceKeys: Object.keys(context.memory.preferences),
        recordCount: context.memory.records.length,
        recordCategories: Array.from(
          new Set(context.memory.records.map((record) => record.category))
        ),
        successfulFeedbackCount: context.memory.feedback.successfulRecords.length,
        failedFeedbackCount: context.memory.feedback.failedRecords.length,
        agentSignals: context.memory.feedback.agentPerformance.length,
        toolSignals: context.memory.feedback.toolEffectiveness.length,
      },
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const rawOutput = await this.callModel(prompt.system, prompt.user);
        this.log("planner_raw_output", {
          model: this.model,
          attempt: attempt + 1,
          rawOutput,
        });

        const parsed = parsePlannerOutput(rawOutput);
        return this.mapToDomainPlan(context, parsed, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown planner error");
        this.log("planner_validation_error", {
          model: this.model,
          attempt: attempt + 1,
          errorName: lastError.name,
          errorMessage: lastError.message,
        });

        const retryable =
          lastError instanceof PlannerOutputTransportError ||
          lastError instanceof PlannerOutputValidationError;

        if (!retryable || attempt === this.maxRetries) {
          break;
        }
      }
    }

    throw new PlannerModelError(
      `Planner model failed to produce a valid plan: ${
        lastError?.message ?? "unknown error"
      }`
    );
  }

  private buildPrompt(
    context: PlanningContext,
    options: GeneratePlanOptions
  ) {
    const system = [
      "You are Maestro Planner, the planning core of an AI orchestration platform.",
      "Return one valid JSON object only. Do not include markdown, prose, code fences, or commentary.",
      "Generate a structured execution plan derived strictly from the provided objective, project context, scan results, risks, and retrieved memory.",
      "Produce executable steps only.",
      `Use only phases from this allowed list: ${SUPPORTED_PLANNER_PHASES.join(", ")}.`,
      "Limit the plan to a maximum of 15 ordered steps.",
      "Dependencies must be acyclic and reference only step ids that exist in the same response.",
      "Each step must include: id, title, summary, phase, type, order, agent, dependencies, risk, expectedOutput.",
      "Step type must be one of: analysis, generation, modification, validation.",
      "Reasoning summary must be concise and no longer than 5 sentences.",
      "Confidence must be a number between 0 and 1.",
      "Do not invent capabilities that are not supported by the supplied context.",
      "Be multi-tenant safe and never rely on data outside the provided input.",
      "Use retrieved evaluation feedback as the primary source of planning adaptation.",
      "Prefer high-score patterns that are similar to the current objective.",
      "Explicitly avoid repeating low-score or failed patterns when constructing the plan.",
      "When agent or tool performance signals are present, favor stronger performers for similar work and avoid weaker sequences unless required by dependencies.",
      `Candidate variant index: ${(options.candidateIndex ?? 0) + 1} of ${options.totalCandidates ?? 1}.`,
      "Produce a meaningfully distinct but still valid plan variant for each candidate index.",
    ].join(" ");

    const user = JSON.stringify(
      {
        objective: context.objective,
        project: {
          id: context.project.id,
          name: context.project.name,
          rootPath: context.project.rootPath,
          currentPhase: context.project.currentPhase,
        },
        scan: context.scan,
        risks: context.risks,
        generation: {
          candidateIndex: options.candidateIndex ?? 0,
          totalCandidates: options.totalCandidates ?? 1,
        },
        memory: {
          recentProjects: context.memory.recentProjects,
          recentDecisions: context.memory.recentDecisions,
          preferences: context.memory.preferences,
          records: context.memory.records,
          feedback: {
            successfulRecords: context.memory.feedback.successfulRecords,
            failedRecords: context.memory.feedback.failedRecords,
            successPatterns: context.memory.feedback.successPatterns,
            failurePatterns: context.memory.feedback.failurePatterns,
            agentPerformance: context.memory.feedback.agentPerformance,
            toolEffectiveness: context.memory.feedback.toolEffectiveness,
          },
        },
      },
      null,
      2
    );

    return { system, user };
  }

  private async callModel(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: this.temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;

    if (!response.ok) {
      throw new PlannerModelError(
        `OpenAI planner request failed with status ${response.status}: ${
          payload?.error?.message ?? "unknown error"
        }`
      );
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new PlannerOutputTransportError(
        "Planner model returned an empty or non-string message content."
      );
    }

    return content;
  }

  private mapToDomainPlan(
    context: PlanningContext,
    parsed: ReturnType<typeof parsePlannerOutput>,
    options: GeneratePlanOptions
  ): Plan {
    const jobs = this.buildJobs(parsed.steps);
    const phases = jobs.map((job) => ({
      phase: job.phase,
      summary: `${job.tasks.length} planned step(s) compiled into phase ${job.phase}.`,
      taskCount: job.tasks.length,
    }));

    return {
      objective: context.objective,
      project: {
        id: context.project.id,
        name: context.project.name,
        rootPath: context.project.rootPath,
        currentPhase: context.project.currentPhase,
      },
      goals: parsed.goals,
      steps: parsed.steps,
      agentsRequired: parsed.agentsRequired,
      dependencies: parsed.dependencies,
      risks: parsed.risks,
      confidence: parsed.confidence,
      reasoningSummary: parsed.reasoningSummary,
      jobs,
      phases,
      summary: {
        totalJobs: jobs.length,
        totalTasks: jobs.reduce((acc, job) => acc + job.tasks.length, 0),
        highRiskCount: parsed.risks.filter((risk) => risk.level === "HIGH").length,
      },
      metadata: {
        planner: "openai",
        model: this.model,
        candidateIndex: options.candidateIndex ?? 0,
        totalCandidates: options.totalCandidates ?? 1,
      },
    };
  }

  private buildJobs(steps: PlanStep[]): MaestroJob[] {
    const grouped = new Map<string, PlanStep[]>();

    for (const step of steps) {
      const current = grouped.get(step.phase) ?? [];
      current.push(step);
      grouped.set(step.phase, current);
    }

    return Array.from(grouped.entries()).map(([phase, phaseSteps]) => ({
      id: phase,
      phase,
      tasks: phaseSteps
        .sort((a, b) => a.order - b.order)
        .map((step) => this.toTask(step)),
    }));
  }

  private toTask(step: PlanStep): MaestroTask {
    const action: MaestroAction = {
      id: step.id,
      name: step.title,
      type: step.type,
      risk: this.toPhaseRisk(step.risk),
      execute: async () => {},
    };

    return {
      id: `${step.phase}:${step.id}`,
      action,
      status: TaskStatus.PENDING,
    };
  }

  private toPhaseRisk(risk: PlanStep["risk"]): PhaseRisk {
    if (risk === "HIGH") return PhaseRisk.HIGH;
    if (risk === "MEDIUM") return PhaseRisk.MEDIUM;
    return PhaseRisk.LOW;
  }

  private log(event: string, payload: Record<string, unknown>) {
    console.info(
      JSON.stringify({
        scope: "maestro.planner",
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      })
    );
  }
}
