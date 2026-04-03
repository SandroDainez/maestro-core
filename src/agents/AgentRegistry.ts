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

  findAllForTask(task: string): BaseAgent[] {
    return this.agents.filter((agent) => agent.canHandle(task));
  }

  findByName(name: string): BaseAgent | undefined {
    return this.agents.find((agent) => agent.name === name);
  }

  listNames(): string[] {
    return this.agents.map((agent) => agent.name);
  }
}
