// src/core/shell/ShellExecutor.ts

import { spawn } from "child_process";
import * as path from "path";

export interface ShellOptions {
  cwd: string;
  timeoutMs?: number;
}

export class ShellExecutor {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Executa comando garantindo que está dentro da base permitida.
   */
  run(command: string, args: string[], options: ShellOptions): Promise<void> {
    const resolvedCwd = path.resolve(options.cwd);

    if (!resolvedCwd.startsWith(this.baseDir)) {
      throw new Error(
        `Execução fora da sandbox bloqueada: ${resolvedCwd} não está dentro de ${this.baseDir}`
      );
    }

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: resolvedCwd,
        stdio: "inherit",
        shell: false,
      });

      const timeout =
        options.timeoutMs &&
        setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error("Comando shell excedeu timeout."));
        }, options.timeoutMs);

      child.on("exit", (code) => {
        if (timeout) clearTimeout(timeout);

        if (code === 0) resolve();
        else reject(new Error(`Processo saiu com código ${code}`));
      });
    });
  }
}

