import type { ZodType } from "zod";

export type ToolExecutionContext = {
  projectRoot: string;
  tenantId?: string;
  stepId?: string;
  sandbox?: {
    writableRoots?: string[];
    protectedPaths?: string[];
  };
  limits?: {
    maxToolCalls?: number;
    maxOutputBytes?: number;
  };
  guardrails?: {
    allowDestructiveCommands?: boolean;
  };
};

export type ToolUsageTrace = {
  toolName: string;
  status: "success" | "failed";
  durationMs: number;
  input: unknown;
  output?: unknown;
  error?: string;
};

export interface Tool<TInput, TOutput> {
  name: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;
}
