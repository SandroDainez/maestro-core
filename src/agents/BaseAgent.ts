export interface AgentContext {
  project?: string;
  mode: string;
}

export abstract class BaseAgent {
  abstract name: string;
  abstract specialty: string;

  abstract canHandle(task: string): boolean;

  abstract execute(task: string, context: AgentContext): Promise<void>;
}

