import { BaseAgent } from "./BaseAgent";

export class AgentRegistry {
  private agents: BaseAgent[] = [];

  register(agent: BaseAgent) {
    this.agents.push(agent);
    console.log(`🤖 Agente registrado: ${agent.name}`);
  }

  findForTask(task: string): BaseAgent | undefined {
    return this.agents.find((a) => a.canHandle(task));
  }
}

