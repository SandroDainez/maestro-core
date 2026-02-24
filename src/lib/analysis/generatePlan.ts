interface StackInfo {
  framework: string | null;
  database: string | null;
  deployment: string | null;
  packageManager: string | null;
  hasEdgeFunctions: boolean;
  hasGit: boolean;
  issues: string[];
}

export function generateStabilizationPlan(scan: StackInfo) {
  const phases: string[] = [];

  if (scan.packageManager === "bun") {
    phases.push("bun_install");
    phases.push("bun_build");
  } else {
    phases.push("npm_install");
    phases.push("npm_build");
  }

  if (scan.database === "supabase-sql") {
    phases.push("validate_supabase_schema");
  }

  if (scan.hasEdgeFunctions) {
    phases.push("validate_edge_functions");
  }

  return phases;
}
