import type { AgentExecutionResult } from "./BaseAgent";
import { ToolDrivenAgent, type AgentToolDecision, type ToolDrivenAgentState } from "./ToolDrivenAgent";
import type { ToolRegistry } from "../tools/ToolRegistry";

type ReadOutput = { path: string; exists: boolean; content: string | null };
type CodegenOutput = { content: string; model: string };
type WriteOutput = { path: string; bytesWritten: number };

export class DeveloperAgent extends ToolDrivenAgent {
  name = "Developer";
  specialty = "Apps & Sistemas";

  constructor(tools?: ToolRegistry) {
    super(tools);
  }

  canHandle(task: string): boolean {
    return (
      task.toLowerCase().includes("app") ||
      task.toLowerCase().includes("arquitetura") ||
      task.toLowerCase().includes("sistema")
    );
  }

  protected async decideNextAction(
    state: ToolDrivenAgentState
  ): Promise<AgentToolDecision | null> {
    const requiredReads = ["package.json", "tsconfig.json"];
    for (const targetPath of requiredReads) {
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

    if (!this.hasAction(state, "generate:brief")) {
      const fileReads = state.actions
        .filter((action) => action.toolName === "file_read")
        .map((action) => action.output as ReadOutput);

      const instructions = [
        `Step title: ${state.input.step.title}`,
        `Step summary: ${state.input.step.summary}`,
        `Expected output: ${state.input.step.expectedOutput}`,
        `Dependency results: ${JSON.stringify(state.input.dependencyResults)}`,
        state.input.step.type === "validation"
          ? "Focus on validation criteria and verification guidance."
          : "Produce a concrete implementation brief for this development step.",
      ].join("\n");

      return {
        toolName: "llm_codegen",
        label: "generate:brief",
        input: {
          objective: state.input.step.objective ?? state.input.step.title,
          instructions,
          contextFiles: fileReads.map((file) => ({
            path: file.path,
            content: file.content,
          })),
        },
      };
    }

    if (
      !this.hasAction(state, "write:artifact") &&
      state.input.step.type !== "validation"
    ) {
      const generated = this.findAction(state, "generate:brief")?.output as
        | CodegenOutput
        | undefined;
      if (!generated) return null;

      return {
        toolName: "file_write",
        label: "write:artifact",
        input: {
          path: `.maestro/steps/${state.input.step.id}.md`,
          content: [
            `# ${state.input.step.title}`,
            "",
            `## Summary`,
            state.input.step.summary,
            "",
            `## Expected Output`,
            state.input.step.expectedOutput,
            "",
            `## Generated Implementation Brief`,
            generated.content,
          ].join("\n"),
        },
      };
    }

    return null;
  }

  protected async onToolResult(
    state: ToolDrivenAgentState,
    decision: AgentToolDecision,
    output: unknown
  ): Promise<void> {
    if (decision.label === "generate:brief") {
      state.logs.push(`developer:generated:${(output as CodegenOutput).model}`);
    }
    if (decision.label === "write:artifact") {
      state.logs.push(`developer:artifact:${(output as WriteOutput).path}`);
    }
  }

  protected async buildResult(
    state: ToolDrivenAgentState
  ): Promise<AgentExecutionResult> {
    const generated = this.findAction(state, "generate:brief")?.output as
      | CodegenOutput
      | undefined;
    const artifact = this.findAction(state, "write:artifact")?.output as
      | WriteOutput
      | undefined;

    return {
      result: {
        implementedStep: state.input.step.id,
        expectedOutput: state.input.step.expectedOutput,
        artifactPath: artifact?.path ?? null,
        bytesWritten: artifact?.bytesWritten ?? 0,
        model: generated?.model ?? null,
        generatedContent: generated?.content ?? null,
      },
      logs: state.logs,
      toolUsageTrace: state.toolUsageTrace,
    };
  }
}
