import type { ToolUsageTrace } from "../tools/types";

export type AgentExecutionResult = {
  result: Record<string, unknown>;
  logs: string[];
  toolUsageTrace: ToolUsageTrace[];
};

export type AgentContext = {
  tenantId?: string;
  project?: {
    id?: string;
    name?: string;
    rootPath?: string;
    currentPhase?: string;
  };
  mode: string;
  dependencyResults: Record<string, AgentExecutionResult>;
  metadata?: Record<string, unknown>;
};

export type AgentExecutionInput = {
  step: {
    id: string;
    title: string;
    summary: string;
    type: string;
    expectedOutput: string;
    dependencies: string[];
    objective?: string;
    phase?: string;
    risk?: string;
  };
  executionContext: AgentContext;
  dependencyResults: Record<string, AgentExecutionResult>;
};

export abstract class BaseAgent {
  abstract name: string;
  abstract specialty: string;

  abstract canHandle(task: string): boolean;

  abstract execute(input: AgentExecutionInput): Promise<AgentExecutionResult>;
}
