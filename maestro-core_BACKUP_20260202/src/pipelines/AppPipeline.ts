import { ExecutionPlan } from "../core/Planner";
import { PhaseRegistry } from "./PhaseRegistry";
import { MaestroContext, MaestroMode, MaestroProject } from "../types";
import readline from "readline";

export class AppPipeline {
  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: MaestroMode,
    plan?: ExecutionPlan
  ): Promise<string> {
    if (!plan) {
      throw new Error("Plano de execução não fornecido ao pipeline.");
    }

    let output = `📦 Pipeline iniciado em ${project.path}\n`;

    for (const phasePlan of plan.phases) {
      const phase = PhaseRegistry.get(phasePlan.id);

      if (mode === "interactive") {
        const ok = await this.askConfirmation(
          `\n▶️ Executar fase: ${phase.label}? (s/n): `
        );

        if (!ok) {
          return `${output}\n⏹ Execução interrompida pelo usuário após ${phase.label}.`;
        }
      }

      output += `\n🚀 Rodando fase: ${phase.label}\n`;

      const result = await phase.run(project, ctx, mode);

      output += result + "\n";
    }

    return output + "\n✅ Todas as fases concluídas.";
  }

  private askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.toLowerCase().startsWith("s"));
      });
    });
  }
}

