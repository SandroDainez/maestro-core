import { ParsedCommand } from "./CommandParser";

export type PlannedPhase = {
  id: string;
  label: string;
};

export type ExecutionPlan = {
  product: string;
  domain: string;
  kind: "app" | "api" | "site" | "agent";
  stack: string[];
  phases: PlannedPhase[];
};

export class Planner {
  static createPlan(parsed: ParsedCommand): ExecutionPlan {
    const goal = parsed.objective.toLowerCase();

    // heurística inicial — depois vira LLM driven
    let kind: ExecutionPlan["kind"] = "app";

    if (goal.includes("api")) kind = "api";
    if (goal.includes("site")) kind = "site";
    if (goal.includes("agent")) kind = "agent";

    const domain = goal.includes("clínica") || goal.includes("clinica")
      ? "medical"
      : "general";

    const stack: string[] = ["typescript"];

    if (kind === "app") {
      stack.push("nextjs", "auth", "database");
    }

    const phases: PlannedPhase[] = [
      { id: "scaffold", label: "Scaffold do projeto" },
      { id: "auth", label: "Autenticação" },
      { id: "database", label: "Banco de dados" },
      { id: "dashboard", label: "Dashboard" },
      { id: "deploy", label: "Deploy" },
    ];

    return {
      product: parsed.objective,
      domain,
      kind,
      stack,
      phases,
    };
  }
}

