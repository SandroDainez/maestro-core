import type { AgentExecutionResult } from "./BaseAgent";
import { ToolDrivenAgent, type AgentToolDecision, type ToolDrivenAgentState } from "./ToolDrivenAgent";
import type { ToolRegistry } from "../tools/ToolRegistry";

type ReadOutput = { path: string; exists: boolean; content: string | null };
type CodegenOutput = { content: string; model: string };

export class GovernanceAgent extends ToolDrivenAgent {
  name = "Governance";
  specialty = "Risco, aprovação humana, auditoria e políticas";

  constructor(tools?: ToolRegistry) {
    super(tools);
  }

  canHandle(task: string): boolean {
    const normalized = task.toLowerCase();
    return (
      normalized.includes("governance") ||
      normalized.includes("approval") ||
      normalized.includes("audit") ||
      normalized.includes("risk") ||
      normalized.includes("risco")
    );
  }

  protected async decideNextAction(
    state: ToolDrivenAgentState
  ): Promise<AgentToolDecision | null> {
    const files = ["data/governance-audit.jsonl", ".maestro-memory.json"];
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

    if (!this.hasAction(state, "generate:governance-review")) {
      const contextFiles = state.actions
        .filter((action) => action.toolName === "file_read")
        .map((action) => action.output as ReadOutput);

      return {
        toolName: "llm_codegen",
        label: "generate:governance-review",
        input: {
          objective: state.input.step.objective ?? state.input.step.title,
          instructions: [
            `Review governance posture for step: ${state.input.step.title}`,
            `Summary: ${state.input.step.summary}`,
            `Dependencies: ${state.input.step.dependencies.join(", ") || "none"}`,
            `Dependency results: ${JSON.stringify(state.input.dependencyResults)}`,
            "Produce approval, audit, and policy guidance.",
          ].join("\n"),
          contextFiles: contextFiles.map((file) => ({
            path: file.path,
            content: file.content,
          })),
        },
      };
    }

    return null;
  }

  protected async buildResult(
    state: ToolDrivenAgentState
  ): Promise<AgentExecutionResult> {
    const generated = this.findAction(state, "generate:governance-review")?.output as
      | CodegenOutput
      | undefined;

    return {
      result: {
        summary: `Governance review completed for ${state.input.step.title}.`,
        auditedStep: state.input.step.id,
        dependencyCount: state.input.step.dependencies.length,
        generatedGuidance: generated?.content ?? null,
        model: generated?.model ?? null,
      },
      logs: [...state.logs, `governance:reviewed:${state.input.step.id}`],
      toolUsageTrace: state.toolUsageTrace,
    };
  }
}
