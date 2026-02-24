interface StackInfo {
  framework: string | null;
  database: string | null;
  deployment: string | null;
  packageManager: string | null;
  hasEdgeFunctions: boolean;
  hasGit: boolean;
  issues: string[];
}

export function generateTechnicalReport(scan: StackInfo) {
  const recommendations: string[] = [];
  const risks: string[] = [];

  // Auditoria básica
  if (!scan.hasGit) {
    risks.push("Projeto sem controle de versão (Git)");
  }

  if (scan.packageManager === "bun") {
    recommendations.push("Executar 'bun install' para garantir dependências");
  }

  if (scan.framework === "vite-react") {
    recommendations.push("Validar build com 'bun run build'");
  }

  if (scan.database === "supabase-sql") {
    recommendations.push("Verificar schema.sql e sincronização com Supabase");
  }

  if (scan.hasEdgeFunctions) {
    recommendations.push("Validar edge functions com Deno");
  }

  return {
    maturityLevel: "mid",
    riskLevel: risks.length > 0 ? "medium" : "low",
    risks,
    recommendations
  };
}
