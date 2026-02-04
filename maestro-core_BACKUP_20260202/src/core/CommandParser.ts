export interface ParsedCommand {
  mode: "planejar" | "executar";
  raw: string;
  objective: string;
}

export class CommandParser {
  static parse(input: string): ParsedCommand {
    const lowered = input.toLowerCase();

    if (lowered.startsWith("executar:")) {
      return { mode: "executar", raw: input, objective: input.slice(8).trim() };
    }

    if (lowered.startsWith("planejar:")) {
      return { mode: "planejar", raw: input, objective: input.slice(9).trim() };
    }

    return { mode: "planejar", raw: input, objective: input.trim() };
  }
}

