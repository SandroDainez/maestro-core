import { CommandParser } from "./CommandParser";
import { MemoryStore } from "../memory/MemoryStore";
import { AuditLogger } from "../logs/AuditLogger";
import { Planner } from "./Planner";
import { ProjectRegistry } from "../projects/ProjectRegistry";
import { AppPipeline } from "../pipelines/AppPipeline";
import { MaestroContext } from "../types";
import { randomUUID } from "crypto";
import readline from "readline";

export class MaestroEngine {
  private registry = new ProjectRegistry();

  constructor(
    private memory: MemoryStore,
    private logger: AuditLogger
  ) {}

  async run(goal: string, cwd: string) {
    const parsed = CommandParser.parse(goal);

    const plan = Planner.createPlan(parsed);

    console.log("\n🧠 Plano detectado:");
    console.log(`Produto: ${plan.product}`);
    console.log(`Domínio: ${plan.domain}`);
    console.log(`Tipo: ${plan.kind}`);
    console.log(`Stack: ${plan.stack.join(", ")}`);
    console.log("Fases:");

    plan.phases.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.label}`);
    });

    const approved = await this.askConfirmation(
      "\n👉 Executar esse plano? (s/n): "
    );

    if (!approved) {
      return "Execução cancelada.";
    }

    const projectRecord = this.registry.create(parsed.objective);

    const project = {
      id: projectRecord.id,
      name: projectRecord.name,
      path: projectRecord.path,
      createdAt: projectRecord.createdAt,
    };

    const runId = randomUUID();

    const ctx: MaestroContext = {
      runId,
      goal,
      startedAt: new Date(),
      cwd: project.path,
    };

    const pipeline = new AppPipeline();

    const result = await pipeline.run(project, ctx, "interactive", plan);

    this.memory.save(runId, {
      goal,
      plan,
      project,
      result,
    });

    return {
      projectId: project.id,
      runId,
      result,
    };
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

