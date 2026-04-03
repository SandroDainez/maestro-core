import path from "path";

import { AgentPlanner, AgentPhaseDefinition, AgentObjectiveContext } from "./AgentPlanner";
import { ensureDir, writeText, writeJson } from "@/src/utils/fsx";
import { RunRepository } from "@/src/db/repositories/run.repo";
import { PhaseRunRepository } from "@/src/db/phase-run.repository";
import { TenantRepository } from "@/src/db/tenant.repository";
import { ProjectRepository } from "@/src/db/project.repository";
import type { Prisma } from "@prisma/client";
import { generateCopy } from "./CopyGenerator";

type PhaseResult = {
  phase: string;
  status: "success" | "failed";
  logs: string;
  finishedAt: string;
  details?: string;
};

type ExecutorPhaseOutput = {
  success: boolean;
  logs: string;
  outputs?: string[];
  error?: string;
  details?: string;
};

export type AgentRunOutput = {
  runId: string;
  phases: PhaseResult[];
  objective: string;
};

export class AgentExecutor {
  private planner: AgentPlanner;
  private runRepo = new RunRepository();
  private phaseRepo = new PhaseRunRepository();
  private tenantRepo = new TenantRepository();
  private projectRepo = new ProjectRepository();
  private agentRoot: string;

  constructor(planner?: AgentPlanner) {
    this.planner = planner ?? new AgentPlanner();
    this.agentRoot = path.join(process.cwd(), "agent-executions");
    ensureDir(this.agentRoot);
  }

  async execute(objective: string, context?: AgentObjectiveContext): Promise<AgentRunOutput> {
    const tenant = await this.tenantRepo.ensureDefaultTenant();
    const project = await this.projectRepo.upsertByPath(tenant.id, this.agentRoot);
    const run = await this.runRepo.create(project.id, "agent");
    const runDir = path.join(this.agentRoot, run.id);
    ensureDir(runDir);

    const plan = this.planner.plan(objective, context);
    const phaseResults: PhaseResult[] = [];

    for (const phase of plan) {
      const phaseRun = await this.phaseRepo.create(run.id, phase.code);
      await this.phaseRepo.markRunning(phaseRun.id);
      const output = await this.executePhase(phase, runDir, objective, context);

      await this.phaseRepo.finish(phaseRun.id, output.success ? "success" : "failed", {
        logs: output.logs,
        ...(output.error ? { error: output.error } : {}),
      });

      const entry: PhaseResult = {
        phase: phase.code,
        status: output.success ? "success" : "failed",
        logs: output.logs,
        finishedAt: new Date().toISOString(),
        details: output.details,
      };

      phaseResults.push(entry);

      if (!output.success) {
        await this.runRepo.finish(run.id, "failed", {
          objective,
          phases: phaseResults,
        });
        throw new Error(output.error ?? "Phase failed");
      }
    }

    await this.runRepo.finish(run.id, "success", {
      objective,
      phases: phaseResults,
    });

    return {
      runId: run.id,
      phases: phaseResults,
      objective,
    };
  }

  private async executePhase(
    phase: AgentPhaseDefinition,
    runDir: string,
    objective: string,
    context?: AgentObjectiveContext
  ): Promise<ExecutorPhaseOutput> {
    switch (phase.code) {
      case "research-product": {
        const summary = [
          `Objetivo: ${objective}`,
          `Produto: ${context?.product ?? "agregado"}`,
          `Público: ${context?.audience ?? "geral"}`,
          `Principais entregas: ${context?.deliverables?.join(", ") ?? "LAN, CAMPANHA"}`,
        ].join("\n");
        const target = path.join(runDir, "research.md");
        await writeText(target, summary);
        return {
          success: true,
          logs: `Pesquisa escrita em ${target}`,
          outputs: [target],
          details: `Pesquisa com foco em ${context?.product ?? "produto"} e público ${
            context?.audience ?? "geral"
          }`,
        };
      }

      case "generate-copy": {
        const copy = generateCopy({
          objective,
          product: context?.product,
          audience: context?.audience,
        });

        const target = path.join(runDir, "copy.json");
        await writeJson(target, copy);
        return {
          success: true,
          logs: `Copy salva em ${target}`,
          outputs: [target],
          error: undefined,
          details: `${copy.headline} · ${copy.description}`,
        };
      }

      case "generate-landing": {
        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Landing: ${context?.product ?? "Produto Maestro"}</title>
  <style>
    body { font-family: 'Space Grotesk', sans-serif; margin: 0; background:#030712; color:#f8fafc; display:flex; justify-content:center; align-items:center; min-height:100vh; }
    .card { background:linear-gradient(135deg,#0f172a,#1f2937); padding:3rem; border-radius:32px; box-shadow:0 20px 120px rgba(15,23,42,.6); width:min(600px,90vw); }
    button { margin-top:1.5rem; background:#22d3ee; border:none; border-radius:999px; padding:0.75rem 2rem; font-weight:700; cursor:pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Domine ${context?.product ?? "seu nicho"} agora</h1>
    <p>Campanha criada automaticamente pelo Maestro IA com base no objetivo publicado.</p>
    <button>Quero acessar</button>
  </div>
</body>
</html>`;
        const target = path.join(runDir, "landing.html");
        await writeText(target, html);
        return {
          success: true,
          logs: `Landing pronta em ${target}`,
          outputs: [target],
          details: `Landing responsiva para ${context?.product ?? "produto"} com CTA focado em conversão`,
        };
      }

      case "launch-campaign": {
        const copy = generateCopy({
          objective,
          product: context?.product,
          audience: context?.audience,
        });

        const copyTarget = path.join(runDir, "copy.json");
        await writeJson(copyTarget, copy);

        const campaign = {
          platforms: ["Meta Ads", "Google Ads"],
          budget: "R$ 1.200,00",
          message: `Campanha de afiliado para ${context?.product ?? "produto"}`,
        };
        const campaignTarget = path.join(runDir, "campaign.json");
        await writeJson(campaignTarget, campaign);
        return {
          success: true,
          logs: `Campanha configurada em ${campaignTarget}`,
          outputs: [copyTarget, campaignTarget],
          details: `${campaign.platforms.join(", ")} · ${campaign.budget}`,
        };
      }

      case "monitor-performance": {
        const report = {
          clicks: 0,
          leads: 0,
          commissions: "R$ 0,00",
        };
        const target = path.join(runDir, "report.json");
        await writeJson(target, report);
        return {
          success: true,
          logs: `Relatório inicial em ${target}`,
          outputs: [target],
          details: "Monitoramento inicial do desempenho com cliques, leads e comissões",
        };
      }

      case "produce-slides": {
        const content = `Slides para ${objective}\n\n1. Introdução\n2. Benefícios\n3. Proposta de valor\n4. Chamadas para ação`;
        const target = path.join(runDir, "slides.md");
        await writeText(target, content);
        return {
          success: true,
          logs: `Slides gerados em ${target}`,
          outputs: [target],
          details: "Slides e roteiro em Markdown para apresentação",
        };
      }

      case "produce-video": {
        const script = `Roteiro de vídeo para ${objective}\nCena 1: abertura sob Fundo escuro...`;
        const target = path.join(runDir, "video-script.txt");
        await writeText(target, script);
        return {
          success: true,
          logs: `Roteiro de vídeo salvo em ${target}`,
          outputs: [target],
          details: "Roteiro dividido por cenas com foco em narrativa",
        };
      }

      case "compose-music": {
        const composition = {
          tempo: "90 BPM",
          key: "F#m",
          mood: "Confiante",
          hook: `Afiliado ${objective}`,
        };
        const target = path.join(runDir, "music.json");
        await writeJson(target, composition);
        return {
          success: true,
          logs: `Rascunho de música salvo em ${target}`,
          outputs: [target],
          details: "Estrutura de trilha sonora com gancho marcante",
        };
      }

      default:
        return {
          success: true,
          logs: `Fase ${phase.code} executada`,
        };
    }
  }
}
