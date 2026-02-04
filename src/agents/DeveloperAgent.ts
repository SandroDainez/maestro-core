import { BaseAgent, AgentContext } from "./BaseAgent";

export class DeveloperAgent extends BaseAgent {
  name = "Developer";
  specialty = "Apps & Sistemas";

  canHandle(task: string): boolean {
    return (
      task.toLowerCase().includes("app") ||
      task.toLowerCase().includes("arquitetura") ||
      task.toLowerCase().includes("sistema")
    );
  }

  async execute(task: string, context: AgentContext) {
    console.log(`👨‍💻 [${this.name}] trabalhando em: ${task}`);
    await new Promise((r) => setTimeout(r, 1200));
    console.log(`👨‍💻 [${this.name}] terminou: ${task}`);
  }
}

