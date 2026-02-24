import { spawn } from "child_process";

type ExecResult = {
  code: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export async function execCmd(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeoutMs?: number } 
): Promise<ExecResult> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000; // 10 min default

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: process.env,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Timeout executando ${cmd} ${args.join(" ")} (>${timeoutMs}ms)`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - started,
      });
    });
  });
}
