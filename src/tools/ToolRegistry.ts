import type { Tool, ToolExecutionContext, ToolUsageTrace } from "./types";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool<unknown, unknown>>();
  private readonly invocationCountByStep = new Map<string, number>();

  register<TInput, TOutput>(tool: Tool<TInput, TOutput>) {
    this.tools.set(tool.name, tool as Tool<unknown, unknown>);
  }

  get(name: string) {
    return this.tools.get(name);
  }

  listNames() {
    return Array.from(this.tools.keys());
  }

  async invoke<TInput, TOutput>(
    name: string,
    input: TInput,
    context: ToolExecutionContext
  ): Promise<{ output: TOutput; trace: ToolUsageTrace }> {
    const tool = this.tools.get(name) as Tool<TInput, TOutput> | undefined;
    if (!tool) {
      throw new Error(`Tool not registered: ${name}`);
    }

    this.enforceLimits(context);
    const startedAt = Date.now();
    const parsedInput = tool.inputSchema.parse(input);

    try {
      const rawOutput = await tool.execute(parsedInput, context);
      const output = tool.outputSchema.parse(rawOutput);
      const trace: ToolUsageTrace = {
        toolName: name,
        status: "success",
        durationMs: Date.now() - startedAt,
        input: parsedInput,
        output,
      };
      this.log(trace);
      return { output, trace };
    } catch (error) {
      const trace: ToolUsageTrace = {
        toolName: name,
        status: "failed",
        durationMs: Date.now() - startedAt,
        input: parsedInput,
        error: error instanceof Error ? error.message : "Unknown tool error",
      };
      this.log(trace);
      throw error;
    }
  }

  private log(trace: ToolUsageTrace) {
    console.info(
      JSON.stringify({
        scope: "maestro.tools",
        event: "tool_call",
        timestamp: new Date().toISOString(),
        ...trace,
      })
    );
  }

  private enforceLimits(context: ToolExecutionContext) {
    const stepId = context.stepId;
    const maxToolCalls = context.limits?.maxToolCalls;
    if (!stepId || typeof maxToolCalls !== "number") {
      return;
    }

    const current = this.invocationCountByStep.get(stepId) ?? 0;
    if (current >= maxToolCalls) {
      throw new Error(`Tool call limit exceeded for step ${stepId}.`);
    }

    this.invocationCountByStep.set(stepId, current + 1);
  }
}
