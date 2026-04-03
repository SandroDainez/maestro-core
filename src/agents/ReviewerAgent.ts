import type { AgentExecutionResult } from "./BaseAgent";
import { ToolDrivenAgent, type AgentToolDecision, type ToolDrivenAgentState } from "./ToolDrivenAgent";
import type { ToolRegistry } from "../tools/ToolRegistry";

type CodegenOutput = { content: string; model: string };

export class ReviewerAgent extends ToolDrivenAgent {
  name = "Reviewer";
  specialty = "Qualidade, risco e coerência arquitetural";

  constructor(tools?: ToolRegistry) {
    super(tools);
  }

  canHandle(task: string): boolean {
    const normalized = task.toLowerCase();
    return (
      normalized.includes("review") ||
      normalized.includes("risco") ||
      normalized.includes("arquitetura") ||
      normalized.includes("governance")
    );
  }

  protected async decideNextAction(
    state: ToolDrivenAgentState
  ): Promise<AgentToolDecision | null> {
    if (!this.hasAction(state, "generate:review")) {
      return {
        toolName: "llm_codegen",
        label: "generate:review",
        input: {
          objective: state.input.step.objective ?? state.input.step.title,
          instructions: [
            `Review step: ${state.input.step.title}`,
            `Summary: ${state.input.step.summary}`,
            `Expected output: ${state.input.step.expectedOutput}`,
            `Dependency results: ${JSON.stringify(state.input.dependencyResults)}`,
            "Produce a concise review with risks, verification notes, and acceptance criteria.",
          ].join("\n"),
          contextFiles: [],
        },
      };
    }

    return null;
  }

  protected async buildResult(
    state: ToolDrivenAgentState
  ): Promise<AgentExecutionResult> {
    const generated = this.findAction(state, "generate:review")?.output as
      | CodegenOutput
      | undefined;

    return {
      result: {
        summary: `Review completed for ${state.input.step.title}.`,
        reviewedStep: state.input.step.id,
        expectedOutput: state.input.step.expectedOutput,
        generatedReview: generated?.content ?? null,
        model: generated?.model ?? null,
      },
      logs: [...state.logs, `reviewer:reviewed:${state.input.step.id}`],
      toolUsageTrace: state.toolUsageTrace,
    };
  }
}
