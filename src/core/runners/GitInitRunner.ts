import { MaestroAction, PhaseRisk } from "../../types";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export class GitInitRunner {
  getActions(): MaestroAction[] {
    return [
      {
        id: "git-init",
        name: "Inicializar repositório Git",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          console.log("📁 git init");
          await execAsync("git init");
        },
      },
    ];
  }
}

