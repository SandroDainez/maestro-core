import { runAutopilot } from "./autopilot";

export async function dispatchCli(argv: string[]) {
  const [cmd, ...rest] = argv;

  if (!cmd) {
    console.log("Uso: maestro <comando> ...");
    console.log("Comandos: autopilot");
    process.exit(1);
  }

  if (cmd === "autopilot") {
    await runAutopilot(rest);
    return;
  }

  console.log(`Comando desconhecido: ${cmd}`);
  console.log("Comandos: autopilot");
  process.exit(1);
}

