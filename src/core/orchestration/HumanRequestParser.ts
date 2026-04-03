export type MaestroIntent = "scan" | "plan" | "report" | "execute";

export type ParsedHumanRequest = {
  intent: MaestroIntent;
  path: string;
  objective: string;
  dryRun: boolean;
};

const EXECUTE_TOKENS = [
  "execute",
  "executa",
  "executar",
  "rodar",
  "rode",
  "run",
  "implemente",
  "implementar",
  "corrija",
  "corrigir",
  "aplique",
  "aplicar",
  "estabilize",
  "estabilizar",
];

const REPORT_TOKENS = [
  "relatorio",
  "relatório",
  "diagnostico",
  "diagnóstico",
  "explique",
  "explicar",
  "resuma",
  "resumir",
];

const PLAN_TOKENS = [
  "planeje",
  "planejar",
  "plano",
  "estrategia",
  "estratégia",
  "roadmap",
];

const SCAN_TOKENS = [
  "analise",
  "analisar",
  "analisa",
  "análise",
  "scan",
  "audite",
  "auditar",
  "inspecione",
  "inspecionar",
];

const DRY_RUN_TOKENS = [
  "sem executar",
  "nao execute",
  "não execute",
  "apenas analise",
  "só analise",
  "somente analise",
  "somente analyze",
];

export class HumanRequestParser {
  parse(input: string, path = "."): ParsedHumanRequest {
    const objective = input.trim();
    const normalized = objective.toLowerCase();

    const dryRun = DRY_RUN_TOKENS.some((token) => normalized.includes(token));

    if (!objective) {
      return {
        intent: "plan",
        path,
        objective: "Planejar a proxima evolucao do projeto atual",
        dryRun: true,
      };
    }

    if (!dryRun && EXECUTE_TOKENS.some((token) => normalized.includes(token))) {
      return { intent: "execute", path, objective, dryRun: false };
    }

    if (REPORT_TOKENS.some((token) => normalized.includes(token))) {
      return { intent: "report", path, objective, dryRun: true };
    }

    if (PLAN_TOKENS.some((token) => normalized.includes(token))) {
      return { intent: "plan", path, objective, dryRun: true };
    }

    if (SCAN_TOKENS.some((token) => normalized.includes(token))) {
      return { intent: "scan", path, objective, dryRun: true };
    }

    return {
      intent: dryRun ? "plan" : "execute",
      path,
      objective,
      dryRun,
    };
  }
}
