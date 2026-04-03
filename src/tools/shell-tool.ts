import { z } from "zod";

import { execCmd } from "../lib/runner/exec";
import type { Tool } from "./types";

const DESTRUCTIVE_COMMANDS = new Set(["rm", "mv", "chmod", "chown", "dd"]);

export const ShellCommandTool: Tool<
  {
    command: string;
    args: string[];
    cwd?: string;
    timeoutMs?: number;
  },
  {
    code: number;
    stdout: string;
    stderr: string;
    durationMs: number;
  }
> = {
  name: "shell_command",
  inputSchema: z.object({
    command: z.string().min(1),
    args: z.array(z.string()),
    cwd: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
  }),
  outputSchema: z.object({
    code: z.number().int(),
    stdout: z.string(),
    stderr: z.string(),
    durationMs: z.number().nonnegative(),
  }),
  async execute(input, context) {
    const cwd = input.cwd ?? context.projectRoot;
    if (!cwd.startsWith(context.projectRoot)) {
      throw new Error(`Shell cwd escapes sandbox root: ${cwd}`);
    }
    if (
      !context.guardrails?.allowDestructiveCommands &&
      DESTRUCTIVE_COMMANDS.has(input.command)
    ) {
      throw new Error(`Destructive shell command blocked: ${input.command}`);
    }

    return execCmd(input.command, input.args, {
      cwd,
      timeoutMs: input.timeoutMs,
    });
  },
};
