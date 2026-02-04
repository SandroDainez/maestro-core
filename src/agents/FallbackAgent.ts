import { BaseAgent, AgentContext } from "./BaseAgent";

export class FallbackAgent extends BaseAgent {
  name = "Maestro-Orchestrator";
  specialty = "Fallback / Planejamento";

  canHandle(_task: string): boolean {
    return true; // aceita qualquer coisa
  }

  async execute(task: string, _context: AgentContext) {
    console.log(`🧠 [${this.name}] analisando tarefa sem agente específico: ${task}`);
    await new Promise((r) => setTimeout(r, 800));
    console.log(`🧠 [${this.name}] sugeriu criação de agente especializado.`);
  }
}

