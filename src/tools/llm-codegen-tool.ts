import { z } from "zod";

import type { Tool } from "./types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

export const LLMCodeGenerationTool: Tool<
  {
    objective: string;
    instructions: string;
    contextFiles?: Array<{ path: string; content: string | null }>;
  },
  {
    content: string;
    model: string;
  }
> = {
  name: "llm_codegen",
  inputSchema: z.object({
    objective: z.string().min(1),
    instructions: z.string().min(1),
    contextFiles: z
      .array(
        z.object({
          path: z.string(),
          content: z.string().nullable(),
        })
      )
      .optional(),
  }),
  outputSchema: z.object({
    content: z.string().min(1),
    model: z.string().min(1),
  }),
  async execute(input) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_CODEGEN_MODEL ?? "gpt-4.1-mini";

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for llm_codegen.");
    }

    const systemPrompt =
      "You are a production software engineering assistant. Return concise implementation guidance or code content only, without markdown fences unless explicitly required.";
    const userPrompt = JSON.stringify(
      {
        objective: input.objective,
        instructions: input.instructions,
        contextFiles: input.contextFiles ?? [],
      },
      null,
      2
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
    if (!response.ok) {
      throw new Error(
        `llm_codegen failed with status ${response.status}: ${
          payload?.error?.message ?? "unknown error"
        }`
      );
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("llm_codegen returned empty content.");
    }

    return {
      content,
      model,
    };
  },
};
