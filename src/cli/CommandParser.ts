import { runAutopilot } from "./autopilot";

export class CommandParser {
  async parse(argv: string[]) {
    const [, , command, subcommand, arg] = argv;

    switch (command) {
      case "autopilot":
        if (subcommand === "run") {
          await runAutopilot(arg);
          return;
        }

        console.log("Uso:");
        console.log("  maestro autopilot run <path>");
        return;

      default:
        console.log("❓ Comando desconhecido:", command);
        console.log("\nComandos disponíveis:");
        console.log("  maestro autopilot run <path>");
        return;
    }
  }
}

