import { BaseAgent, AgentExecutionInput, AgentExecutionResult } from "./BaseAgent";

export class FallbackAgent extends BaseAgent {
  name = "Maestro-Orchestrator";
  specialty = "Fallback / Planejamento";

  canHandle(_task: string): boolean {
    return true; // aceita qualquer coisa
  }

  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    console.log(`🧠 [${this.name}] analisando tarefa sem agente específico: ${input.step.title}`);
    await new Promise((r) => setTimeout(r, 800));
    console.log(`🧠 [${this.name}] sugeriu criação de agente especializado.`);
    return {
      result: {
        summary: `Fallback orchestration completed for ${input.step.title}.`,
        delegated: false,
        expectedOutput: input.step.expectedOutput,
      },
      logs: [`fallback:handled:${input.step.id}`],
      toolUsageTrace: [],
    };
  }
}
