// src/core/git/RollbackRunner.ts

import { ShellExecutor } from "../shell/ShellExecutor";

/**
 * RollbackRunner
 * --------------
 * Executa rollback seguro:
 * - cria branch backup
 * - reseta para commit da fase
 */
export class RollbackRunner {
  constructor(private readonly shell: ShellExecutor) {}

  async rollbackTo(projectDir: string, phase: number, commitHash: string) {
    const backupBranch = `backup-before-phase-${phase}-${Date.now()}`;

    console.log(`🛡 Criando branch de backup: ${backupBranch}`);

    await this.shell.run("git", ["branch", backupBranch], {
      cwd: projectDir,
    });

    console.log(`⏪ Resetando para fase ${phase} (${commitHash})`);

    await this.shell.run("git", ["reset", "--hard", commitHash], {
      cwd: projectDir,
    });
  }
}

