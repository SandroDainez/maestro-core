import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export interface ScanResult {
  projectPath: string;
  gitClean: boolean;
  hasPackageJson: boolean;
  hasDocker: boolean;
  nodeVersion?: string;
  errors: string[];
}

export class ProjectScanner {
  static scan(projectPath: string): ScanResult {
    const errors: string[] = [];

    const run = (cmd: string) => {
      try {
        return execSync(cmd, {
          cwd: projectPath,
          stdio: "pipe",
        }).toString();
      } catch (err: any) {
        errors.push(`Erro ao rodar: ${cmd}`);
        return "";
      }
    };

    // git status
    const gitStatus = run("git status --porcelain");
    const gitClean = gitStatus.trim().length === 0;

    // package.json
    const hasPackageJson = fs.existsSync(
      path.join(projectPath, "package.json")
    );

    // docker
    const hasDocker =
      fs.existsSync(path.join(projectPath, "docker-compose.yml")) ||
      fs.existsSync(path.join(projectPath, "Dockerfile"));

    // node version
    let nodeVersion: string | undefined;
    try {
      nodeVersion = run("node -v").trim();
    } catch {}

    return {
      projectPath,
      gitClean,
      hasPackageJson,
      hasDocker,
      nodeVersion,
      errors,
    };
  }
}


