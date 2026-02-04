import { AutopilotEngine } from "../autopilot/AutopilotEngine";

export async function runAutopilot(projectPath?: string) {
  if (!projectPath) {
    console.error("❌ Caminho do projeto não informado.");
    console.error("Uso: maestro autopilot run <path>");
    process.exit(1);
  }

  const engine = new AutopilotEngine();

  console.log("🤖 Autopilot iniciado...");
  console.log("📂 Projeto:", projectPath);

  const result = await engine.run(projectPath);

  console.log("\n==============================");
  console.log("🤖 AUTOPILOT REPORT");
  console.log("==============================");

  console.log("\n📊 Issues detectados:");
  if (result.issues.length === 0) {
    console.log("✅ Nenhum problema encontrado.");
  } else {
    result.issues.forEach((i) => console.log(`- ${i}`));
  }

  console.log("\n💡 Recomendações:");
  if (result.recommendations.length === 0) {
    console.log("—");
  } else {
    result.recommendations.forEach((r) => console.log(`- ${r}`));
  }
}

