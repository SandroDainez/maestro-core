import { AutopilotScanResult, DetectedStack } from "../types";
import { PackageScanner } from "./scanners/PackageScanner";
import { GitScanner } from "./scanners/GitScanner";
import { PrismaScanner } from "./scanners/PrismaScanner";

export class AutopilotScanner {
  private pkg = new PackageScanner();
  private git = new GitScanner();
  private prisma = new PrismaScanner();

  scan(projectPath: string): AutopilotScanResult {
    const pkgRes = this.pkg.scan(projectPath);
    const gitRes = this.git.scan(projectPath);
    const prismaRes = this.prisma.scan(projectPath);

    const stack = new Set<DetectedStack>();

    // Adds from package.json detection
    for (const s of pkgRes.stackAdds) stack.add(s);

    // Git
    if (gitRes.hasGit) stack.add("git");

    // Prisma schema
    const hasPrismaSchema = prismaRes.hasPrisma;
    const hasPrismaDep = stack.has("prisma");

    const hasPrisma = hasPrismaSchema;
    const hasNext = stack.has("next");
    const hasSupabase = stack.has("supabase");

    return {
      hasNext,
      hasPrisma,
      hasSupabase,
      stack: Array.from(stack),
      scripts: pkgRes.scripts || [],
      packageName: pkgRes.packageName,
      packageManager: pkgRes.packageManager || "unknown",
    };
  }
}

