import type { AgentExecutionResult } from "./BaseAgent";
import { ToolDrivenAgent, type AgentToolDecision, type ToolDrivenAgentState } from "./ToolDrivenAgent";
import type { ToolRegistry } from "../tools/ToolRegistry";

type ReadOutput = { path: string; exists: boolean; content: string | null };
type CodegenOutput = { content: string; model: string };
type WriteOutput = { path: string; bytesWritten: number };

export class ArchitectureAgent extends ToolDrivenAgent {
  name = "Architecture";
  specialty = "Estrutura de sistema, modularização e evolução técnica";

  constructor(tools?: ToolRegistry) {
    super(tools);
  }

  canHandle(task: string): boolean {
    const normalized = task.toLowerCase();
    return (
      normalized.includes("architecture") ||
      normalized.includes("arquitetura") ||
      normalized.includes("dashboard") ||
      normalized.includes("rbac") ||
      normalized.includes("auth")
    );
  }

  protected async decideNextAction(
    state: ToolDrivenAgentState
  ): Promise<AgentToolDecision | null> {
    const files = ["package.json", "tsconfig.json", "prisma/schema.prisma"];
    for (const targetPath of files) {
      const label = `read:${targetPath}`;
      if (!this.hasAction(state, label)) {
        return {
          toolName: "file_read",
          label,
          input: {
            path: targetPath,
            allowMissing: true,
          },
        };
      }
    }

    if (!this.hasAction(state, "generate:architecture-review")) {
      const contextFiles = state.actions
        .filter((action) => action.toolName === "file_read")
        .map((action) => action.output as ReadOutput);

      return {
        toolName: "llm_codegen",
        label: "generate:architecture-review",
        input: {
          objective: state.input.step.objective ?? state.input.step.title,
          instructions: [
            `Review architecture for step: ${state.input.step.title}`,
            `Summary: ${state.input.step.summary}`,
            `Expected output: ${state.input.step.expectedOutput}`,
            `Dependency results: ${JSON.stringify(state.input.dependencyResults)}`,
            "Produce architecture guidance, boundaries, and structural risks.",
          ].join("\n"),
          contextFiles: contextFiles.map((file) => ({
            path: file.path,
            content: file.content,
          })),
        },
      };
    }

    if (!this.hasAction(state, "write:architecture-review")) {
      const generated = this.findAction(state, "generate:architecture-review")?.output as
        | CodegenOutput
        | undefined;
      if (!generated) return null;

      return {
        toolName: "file_write",
        label: "write:architecture-review",
        input: {
          path: `.maestro/architecture/${state.input.step.id}.md`,
          content: generated.content,
        },
      };
    }

    return null;
  }

  protected async buildResult(
    state: ToolDrivenAgentState
  ): Promise<AgentExecutionResult> {
    const generated = this.findAction(state, "generate:architecture-review")?.output as
      | CodegenOutput
      | undefined;
    const artifact = this.findAction(state, "write:architecture-review")?.output as
      | WriteOutput
      | undefined;

    return {
      result: {
        summary: `Architecture review completed for ${state.input.step.title}.`,
        recommendedBoundary: state.input.step.phase ?? "architecture-review",
        expectedOutput: state.input.step.expectedOutput,
        artifactPath: artifact?.path ?? null,
        model: generated?.model ?? null,
      },
      logs: [...state.logs, `architecture:reviewed:${state.input.step.id}`],
      toolUsageTrace: state.toolUsageTrace,
    };
  }
}
