import { execCmd } from "@/src/lib/runner/exec";
import path from "path";

interface CloneInput {
  sourcePath: string;
  sandboxBasePath: string;
}

export async function cloneToSandbox(input: CloneInput) {
  const timestamp = Date.now();
  const projectName = path.basename(input.sourcePath);
  const sandboxName = `${projectName}-autopilot-${timestamp}`;
  const targetPath = path.join(input.sandboxBasePath, sandboxName);

  try {
    const result = await execCmd(
      "/usr/bin/rsync",
      [
        "-a",
        "--exclude",
        "node_modules",
        "--exclude",
        ".next",
        input.sourcePath + "/",
        targetPath
      ],
      { cwd: "/" } // 👈 FORÇANDO cwd válido
    );

    return {
      success: true,
      sandbox: targetPath,
      logs: result
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err)
    };
  }
}
