import { URL } from "url";

export type DatabaseMode = "transaction" | "session";

function parseUrl(raw?: string, name = "DATABASE_URL") {
  if (!raw) {
    return null;
  }
  if (raw.includes("\n") || raw.includes(" ")) {
    throw new Error(`${name} must not contain spaces or newlines.`);
  }
  const url = new URL(raw);
  if (!["postgresql:", "postgres:"].includes(url.protocol)) {
    throw new Error(`${name} must start with postgresql:// or postgres://`);
  }
  if (!url.port) {
    throw new Error(`${name} must include a port (e.g. :6543).`);
  }
  return url.toString();
}

function sanitize(url: string) {
  const parsed = new URL(url);
  parsed.username = "****";
  parsed.password = "****";
  return parsed.toString();
}

export function getDatabaseConfig() {
  const primaryUrl = parseUrl(process.env.DATABASE_URL);
  if (!primaryUrl) {
    throw new Error("DATABASE_URL is required to run the Maestro API.");
  }
  const sessionUrl = parseUrl(process.env.DATABASE_URL_SESSION, "DATABASE_URL_SESSION");
  const preferSession = String(process.env.SUPABASE_USE_SESSION_POOL ?? "false").toLowerCase() === "true";
  const mode: DatabaseMode = preferSession && sessionUrl ? "session" : "transaction";
  const selectedUrl = mode === "session" && sessionUrl ? sessionUrl : primaryUrl;

  console.info(
    `[db] using ${mode} pooler (${sessionUrl ? "session option available" : "session option missing"}) - sanitized URL: ${sanitize(selectedUrl)}`
  );

  return {
    url: selectedUrl,
    mode,
  } as const;
}

export { sanitize as sanitizeDatabaseUrl };
