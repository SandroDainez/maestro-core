import path from "node:path";
import { ProjectScanner } from "./ProjectScanner";
import { AutoFixEngine, AutoFixResult } from "./AutoFixEngine";

export type AutopilotRunOptions = {
  projectPath: string;
};

export type AutopilotFixOptions = {
  projectPath: string;
  apply?: boolean; // se true -> permite push
};

export class AutopilotEngine {
  private scanner = new ProjectScanner();
  private fixer = new AutoFixEngine();

  async runDiagnostics(opts: AutopilotRunOptions) {
    const p = path.resolve(opts.projectPath);
    return this.scanner.scan(p);
  }

  async runAutoFix(opts: AutopilotFixOptions): Promise<AutoFixResult> {
    const p = path.resolve(opts.projectPath);
    const dryRun = !opts.apply; // padrão: true
    return this.fixer.run({ projectPath: p, dryRun });
  }
}

