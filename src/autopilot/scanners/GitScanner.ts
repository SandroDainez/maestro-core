import path from "path";
import { fileExists } from "../../utils/fsx";

export class GitScanner {
  scan(projectPath: string) {
    const gitDir = path.join(projectPath, ".git");
    return { hasGit: fileExists(gitDir) };
  }
}

