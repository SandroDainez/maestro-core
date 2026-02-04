import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export class ShellRunner {
  static exec(command: string, cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(cwd)) {
        return reject(
          new Error(`ShellRunner: cwd não existe: ${cwd}`)
        );
      }

      // SAFE MODE — nunca permitir sair do workspace
      const safeRoot = path.resolve(cwd);
      const resolved = path.resolve(cwd);

      if (!resolved.startsWith(safeRoot)) {
        return reject(
          new Error(
            `[MAESTRO SAFE MODE] BLOQUEADO: Path fora do projeto detectado: ${resolved}`
          )
        );
      }

      console.log(`\n💻 Executando: ${command}`);
      console.log(`📂 Em: ${cwd}\n`);

      const child = spawn(command, {
        cwd,
        shell: true,
        stdio: "inherit",
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `ShellRunner: comando falhou (${code}): ${command}`
            )
          );
        } else {
          resolve();
        }
      });
    });
  }
}

