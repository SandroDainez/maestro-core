import readline from "readline";
import { MaestroEngine } from "./core/MaestroEngine";
import { CommandParser } from "./cli/CommandParser";
import { registerPhases } from "./core/phases/registerPhases";

async function main() {
  // registra todas as fases no startup
  registerPhases();

  // inicializa engine singleton
  MaestroEngine.getInstance();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> "
  });

  const parser = new CommandParser();

  rl.prompt();

  rl.on("line", async (line) => {
    try {
      await parser.parse(line.trim());
    } catch (err: any) {
      console.error("❌ Erro:", err.message);
    }

    rl.prompt();
  });
}

main();

