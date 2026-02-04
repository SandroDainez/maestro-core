import readline from "readline";
import { MaestroEngine } from "../core/MaestroEngine";
import { CommandParser } from "./CommandParser";

export async function startCLI() {
  const maestro = new MaestroEngine();

  maestro.status();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const parser = new CommandParser(maestro);

  rl.on("line", async (line) => {
    const trimmed = line.trim();

    if (!trimmed) return;

    if (trimmed === "exit") {
      console.log("👋 Encerrando...");
      process.exit(0);
    }

    await parser.handle(trimmed);
  });
}

