// src/core/git/GitRunner.ts

import { ShellExecutor } from "../shell/ShellExecutor";

/**
 * GitRunner
 * ---------
 * Responsável por versionar automaticamente as fases executadas.
 * Retorna o hash do commit criado.
 */
export class GitRunner {
  constructor(private readonly shell: ShellExecutor) {}

  async commitPhase(projectDir: string, phase: number): Promise<string> {
    console.log("📝 Criando commit da fase...");

    let hasChanges = true;

    try {
      await this.shell.run("git", ["diff", "--quiet"], {
        cwd: projectDir,
      });
      hasChanges = false;
    } catch {
      hasChanges = true;
    }

    if (hasChanges) {
      await this.shell.run("git", ["add", "."], { cwd: projectDir });

      await this.shell.run(
        "git",
        ["commit", "-m", `Maestro: fase ${phase}`],
        { cwd: projectDir }
      );
    } else {
      console.log("ℹ️ Nenhuma mudança detectada — criando commit vazio.");

      await this.shell.run(
        "git",
        ["commit", "--allow-empty", "-m", `Maestro: fase ${phase}`],
        { cwd: projectDir }
      );
    }

    // Tag da fase (força atualizar)
    await this.shell.run("git", ["tag", "-f", `phase-${phase}`], {
      cwd: projectDir,
    });

    // Pegar hash
    let hash = "";

    await new Promise<void>(async (resolve, reject) => {
      try {
        const result: string[] = [];

        const { spawn } = await import("child_process");

        const child = spawn("git", ["rev-parse", "HEAD"], {
          cwd: projectDir,
        });

        child.stdout.on("data", (d) => result.push(d.toString()));
        child.stderr.on("data", (d) => console.error(d.toString()));

        child.on("exit", (code) => {
          if (code === 0) {
            hash = result.join("").trim();
            resolve();
          } else {
            reject(new Error("Falha ao obter hash do commit."));
          }
        });
      } catch (err) {
        reject(err);
      }
    });

    return hash;
  }
}

