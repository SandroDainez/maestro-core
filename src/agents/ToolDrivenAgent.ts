import { BaseAgent, type AgentExecutionInput, type AgentExecutionResult } from "./BaseAgent";
import type { ToolRegistry } from "../tools/ToolRegistry";
import { createDefaultToolRegistry } from "../tools/default-tool-registry";
import type { ToolUsageTrace } from "../tools/types";

export type AgentToolDecision = {
  toolName: string;
  label: string;
  input: unknown;
};

export type AgentActionRecord = {
  label: string;
  toolName: string;
  output: unknown;
  trace: ToolUsageTrace;
};

export type ToolDrivenAgentState = {
  input: AgentExecutionInput;
  logs: string[];
  toolUsageTrace: ToolUsageTrace[];
  actions: AgentActionRecord[];
  scratchpad: Record<string, unknown>;
};

export abstract class ToolDrivenAgent extends BaseAgent {
  protected readonly tools: ToolRegistry;

  constructor(tools: ToolRegistry = createDefaultToolRegistry()) {
    super();
    this.tools = tools;
  }

  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const projectRoot = input.executionContext.project?.rootPath;
    if (!projectRoot) {
      throw new Error(`${this.name} requires executionContext.project.rootPath.`);
    }

    const state = this.createInitialState(input);
    state.logs.push(`agent:start:${this.name}:${input.step.id}`);

    while (true) {
      const decision = await this.decideNextAction(state);
      if (!decision) break;

      const { output, trace } = await this.tools.invoke(
        decision.toolName,
        decision.input,
        {
          projectRoot,
          tenantId: input.executionContext.tenantId,
          stepId: input.step.id,
          sandbox:
            (input.executionContext.metadata?.sandbox as
              | {
                  writableRoots?: string[];
                  protectedPaths?: string[];
                }
              | undefined) ?? {
              writableRoots: [projectRoot],
              protectedPaths: [],
            },
          limits:
            (input.executionContext.metadata?.limits as
              | {
                  maxToolCalls?: number;
                  maxOutputBytes?: number;
                }
              | undefined) ?? undefined,
          guardrails:
            (input.executionContext.metadata?.guardrails as
              | {
                  allowDestructiveCommands?: boolean;
                }
              | undefined) ?? undefined,
        }
      );

      state.actions.push({
        label: decision.label,
        toolName: decision.toolName,
        output,
        trace,
      });
      state.toolUsageTrace.push(trace);
      state.logs.push(`agent:tool:${this.name}:${decision.toolName}:${decision.label}`);
      await this.onToolResult(state, decision, output);
    }

    state.logs.push(`agent:done:${this.name}:${input.step.id}`);
    return this.buildResult(state);
  }

  protected createInitialState(input: AgentExecutionInput): ToolDrivenAgentState {
    return {
      input,
      logs: [],
      toolUsageTrace: [],
      actions: [],
      scratchpad: {},
    };
  }

  protected findAction(state: ToolDrivenAgentState, label: string) {
    return state.actions.find((action) => action.label === label);
  }

  protected hasAction(state: ToolDrivenAgentState, label: string) {
    return Boolean(this.findAction(state, label));
  }

  protected abstract decideNextAction(
    state: ToolDrivenAgentState
  ): Promise<AgentToolDecision | null>;

  protected async onToolResult(
    _state: ToolDrivenAgentState,
    _decision: AgentToolDecision,
    _output: unknown
  ): Promise<void> {}

  protected abstract buildResult(
    state: ToolDrivenAgentState
  ): Promise<AgentExecutionResult>;
}
