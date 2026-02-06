import fs from "fs";
import path from "path";
import { MaestroAction, PhaseRisk } from "../../types";

export class EnvRunner {
  getActions(): MaestroAction[] {
    return [
      {
        id: "env-example",
        name: "Criar .env.example",
        type: "config",
        risk: PhaseRisk.LOW,
        execute: async () => {
          const file = path.join(process.cwd(), ".env.example");

          if (fs.existsSync(file)) {
            console.log("⚠️ .env.example já existe");
            return;
          }

          fs.writeFileSync(
            file,
            "DATABASE_URL=\nSUPABASE_URL=\nSUPABASE_ANON_KEY=\n",
            "utf-8"
          );

          console.log("✅ .env.example criado");
        },
      },
    ];
  }
}

