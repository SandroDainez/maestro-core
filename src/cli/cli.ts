// src/cli/cli.ts

import { MaestroOrchestrator } from "../core/orchestration/MaestroOrchestrator";
import { RunRepository } from "../db/run.repository";

const orchestrator = new MaestroOrchestrator();

const args = process.argv.slice(2);

function printHumanResult(result: any) {
  console.log(`\nIntent: ${result.intent}`);
  console.log(`Projeto: ${result.project.name}`);
  console.log(`Path: ${result.project.rootPath}`);
  console.log(`Run dir: ${result.runDir}`);
  console.log(`Riscos: ${result.risks.length}`);
  console.log(`Jobs: ${result.jobs.length}`);

  if ("summary" in result) {
    console.log(
      `Tasks: ${result.summary.totalTasks} | High risks: ${result.summary.highRisks}`
    );
  }

  if ("report" in result) {
    console.log(`Readiness: ${result.report.readiness}`);
    console.log(`Recomendacao: ${result.report.recommendation}`);
  }

  if ("multiAgentReview" in result) {
    console.log(`Review: ${result.multiAgentReview.summary}`);
    console.log(`Agentes: ${result.multiAgentReview.participants.join(", ")}`);
  }

  if ("workflow" in result && Array.isArray(result.workflow)) {
    console.log("Workflow:");
    for (const stage of result.workflow) {
      console.log(`- ${stage.code}: ${stage.status}`);
    }
  }

  if ("execution" in result) {
    console.log(`Execucao: ${result.execution.status}`);
    if (result.execution.runRecordId) {
      console.log(`Run persistido: ${result.execution.runRecordId}`);
    }
  }
}

async function main() {
  const cmd = args[0];
  const target = args[1] ?? ".";

  if (!cmd) {
    console.log("Uso:");
    console.log("  scan <path>");
    console.log("  exec <path>");
    console.log('  ask "<pedido em linguagem humana>" [path]');
    console.log("  runs");
    process.exit(1);
  }

  try {
    if (cmd === "scan") {
      console.log("🔍 Rodando Autopilot Scan...");
      const result = await orchestrator.scanProject(target);
      printHumanResult(result);
    }

    if (cmd === "exec") {
      console.log("🚀 Rodando Autopilot + Execução...");
      const result = await orchestrator.runProject(target, true, false, []);
      printHumanResult(result);
    }

    if (cmd === "ask") {
      const request = args[1];
      const path = args[2] ?? ".";

      if (!request) {
        throw new Error('Uso: ask "<pedido em linguagem humana>" [path]');
      }

      const result = await orchestrator.handleHumanRequest({ request, path });
      printHumanResult(result);
    }

    if (cmd === "runs") {
      const runsRepo = new RunRepository();

      const runs = await runsRepo.list();

      console.log("\n📜 Histórico de execuções:\n");

      for (const run of runs) {
        console.log(
          `• ${run.id} | ${run.startedAt.toISOString()} | status=${run.status}`
        );
      }
    }

    if (!["scan", "exec", "ask", "runs"].includes(cmd)) {
      const request = args.join(" ");
      const result = await orchestrator.handleHumanRequest({
        request,
        path: ".",
      });
      printHumanResult(result);
    }
  } catch (err) {
    console.error("💥 Erro fatal:", err);
    process.exit(1);
  }
}

main();
