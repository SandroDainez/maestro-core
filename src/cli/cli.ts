// src/cli/cli.ts

import { MaestroEngine } from "../core/MaestroEngine";
import { MaestroMode } from "../types";

import { RunRepository } from "../db/run.repository";

const engine = new MaestroEngine();

const args = process.argv.slice(2);

async function main() {
  const cmd = args[0];
  const target = args[1] ?? ".";

  if (!cmd) {
    console.log("Uso:");
    console.log("  scan <path>");
    console.log("  exec <path>");
    console.log("  runs");
    process.exit(1);
  }

  try {
    if (cmd === "scan") {
      console.log("🔍 Rodando Autopilot Scan...");
      const output = await engine.autopilotScan(
        target,
        MaestroMode.PLAN
      );

      console.log("✅ Scan finalizado");
      console.log(`📄 Relatório: ${output.reportMarkdownPath}`);
    }

    if (cmd === "exec") {
      console.log("🚀 Rodando Autopilot + Execução...");

      const output = await engine.autopilotScan(
        target,
        MaestroMode.EXECUTE
      );

      await engine.executeJobs(
        output.project.id,
        output.jobs
      );

      console.log("🎉 Execução persistida no banco!");
    }

    if (cmd === "runs") {
      const runsRepo = new RunRepository();

      const runs = await runsRepo.list();

      console.log("\n📜 Histórico de execuções:\n");

      for (const run of runs) {
        console.log(
          `• ${run.id} | ${run.createdAt.toISOString()} | status=${run.status}`
        );
      }
    }
  } catch (err) {
    console.error("💥 Erro fatal:", err);
    process.exit(1);
  }
}

main();

