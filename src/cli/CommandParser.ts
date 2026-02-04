// src/cli/CommandParser.ts

import { MaestroEngine } from "../core/MaestroEngine";

export class CommandParser {
  private engine = MaestroEngine.getInstance();

  async parse(input: string) {
    if (!input) return;

    const [cmd, ...args] = input.trim().split(" ");

    switch (cmd) {
      case "run":
        await this.engine.startPipeline(args);
        break;

      case "resume":
        await this.engine.resumePipeline();
        break;

      case "retry":
        if (!args[0]) {
          console.log("⚠️ Informe a fase. Ex: retry auth");
          return;
        }
        await this.engine.retryPhase(args[0]);
        break;

      case "status":
        await this.engine.printStatus();
        break;

      case "history":
        await this.engine.printHistory();
        break;

      case "help":
        this.printHelp();
        break;

      default:
        console.log(`⚠️ Comando desconhecido: ${cmd}`);
    }
  }

  private printHelp() {
    console.log(`
🎼 MAESTRO CLI

PIPELINE:
 run <fases...>        Executa pipeline
 resume               Continua execução incompleta
 retry <fase>         Reexecuta fase específica

INFO:
 status               Status do projeto ativo
 history              Histórico de execuções

OUTROS:
 help                 Mostra comandos
`);
  }
}

