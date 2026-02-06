import path from "path";
import { AutopilotScanResult, DetectedStack } from "../../types";
import { fileExists, readJson } from "../../utils/fsx";

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

export class PackageScanner {
  scan(
    projectPath: string
  ): Partial<AutopilotScanResult> & { stackAdds: DetectedStack[] } {
    const pkgPath = path.join(projectPath, "package.json");

    if (!fileExists(pkgPath)) {
      return {
        stackAdds: [],
        scripts: [],
        packageManager: "unknown",
      };
    }

    const pkg = readJson<PackageJson>(pkgPath) || {};
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const scripts = Object.keys(pkg.scripts || {});
    const stackAdds: DetectedStack[] = [];

    stackAdds.push("node");

    if (
      deps["typescript"] ||
      fileExists(path.join(projectPath, "tsconfig.json"))
    ) {
      stackAdds.push("typescript");
    }

    if (deps["react"]) stackAdds.push("react");
    if (deps["next"]) stackAdds.push("next");

    if (deps["prisma"] || deps["@prisma/client"]) stackAdds.push("prisma");
    if (deps["@supabase/supabase-js"]) stackAdds.push("supabase");

    const pm = fileExists(path.join(projectPath, "pnpm-lock.yaml"))
      ? "pnpm"
      : fileExists(path.join(projectPath, "yarn.lock"))
      ? "yarn"
      : fileExists(path.join(projectPath, "package-lock.json"))
      ? "npm"
      : "unknown";

    return {
      stackAdds,
      scripts,
      packageName: pkg.name,
      packageManager: pm,
    };
  }
}

