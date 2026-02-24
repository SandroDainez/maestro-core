import { execCmd } from "@/src/lib/runner/exec";

export async function executeStabilization(
  projectPath: string,
  plan: string[]
) {
  const results: any[] = [];

  for (const phase of plan) {
    try {
      let result;

      switch (phase) {
        case "bun_install":
          result = await execCmd("bun", ["install"], { cwd: projectPath });
          break;

        case "bun_build":
          result = await execCmd("bun", ["run", "build"], { cwd: projectPath });
          break;

        case "npm_install":
          result = await execCmd("npm", ["install"], { cwd: projectPath });
          break;

        case "npm_build":
          result = await execCmd("npm", ["run", "build"], { cwd: projectPath });
          break;

        case "validate_supabase_schema":
          result = { message: "Schema validation placeholder", code: 0 };
          break;

        case "validate_edge_functions":
          result = { message: "Edge validation placeholder", code: 0 };
          break;

        default:
          result = { message: "Unknown phase", code: 0 };
      }

      results.push({
        phase,
        success: true,
        output: result
      });
    } catch (error: any) {
      results.push({
        phase,
        success: false,
        error: error.message || String(error)
      });

      break; // Para se falhar
    }
  }

  return results;
}
