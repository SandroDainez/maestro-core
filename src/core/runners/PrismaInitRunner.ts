import { MaestroAction, PhaseRisk } from "../../types";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export class PrismaInitRunner {
  getActions(): MaestroAction[] {
    return [
      {
        id: "prisma-init",
        name: "Inicializar Prisma",
        type: "install",
        risk: PhaseRisk.HIGH,
        execute: async () => {
          console.log("🧬 npx prisma init");
          await execAsync("npx prisma init");
        },
      },
    ];
  }
}

