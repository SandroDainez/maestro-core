import os from "os";
import path from "path";

const APP_TMP_ROOT = path.join(os.tmpdir(), "maestro-app");

export function getAppTmpRoot() {
  return APP_TMP_ROOT;
}

export function getAgentExecutionsRoot() {
  return path.join(APP_TMP_ROOT, "agent-executions");
}

export function isVercelRuntime() {
  return process.env.VERCEL === "1";
}
