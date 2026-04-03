import { randomUUID } from "crypto";

import { MaestroMode } from "../../../src/types";
import { apiError, apiOk } from "../../../src/lib/api";
import { getMaestroEngine, getWritableWorkspace } from "@/src/lib/server/maestro-runtime";
import { appLogger } from "@/src/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_OBJECTIVE_LENGTH = 4_000;
const MAX_BODY_BYTES = 16_384;

function getTimeoutMs() {
  const rawValue = Number(process.env.MAESTRO_RUN_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(rawValue, 55_000);
}

function createTimeoutError(timeoutMs: number) {
  const error = new Error(`Maestro execution exceeded ${timeoutMs}ms.`);
  error.name = "TimeoutError";
  return error;
}

function assertWithinDeadline(startedAt: number, timeoutMs: number) {
  if (Date.now() - startedAt >= timeoutMs) {
    throw createTimeoutError(timeoutMs);
  }
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number) {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(createTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const timeoutMs = getTimeoutMs();

  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");

    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return apiError("Payload excede o limite permitido.", 413, {
        code: "PAYLOAD_TOO_LARGE",
        requestId,
        maxBytes: MAX_BODY_BYTES,
      });
    }

    const body = (await request.json().catch(() => null)) as
      | { objective?: unknown }
      | null;
    const objective =
      typeof body?.objective === "string" ? body.objective.trim() : "";

    if (!objective) {
      return apiError("Campo 'objective' é obrigatório.", 400, {
        code: "INVALID_OBJECTIVE",
        requestId,
      });
    }

    if (objective.length > MAX_OBJECTIVE_LENGTH) {
      return apiError("Campo 'objective' excede o limite permitido.", 400, {
        code: "OBJECTIVE_TOO_LONG",
        requestId,
        maxLength: MAX_OBJECTIVE_LENGTH,
      });
    }

    const workspacePath = getWritableWorkspace();
    const engine = getMaestroEngine();

    appLogger.info("maestro.run.started", {
      requestId,
      timeoutMs,
      workspacePath,
      runtime: process.env.VERCEL === "1" ? "vercel" : "node",
      nodeEnv: process.env.NODE_ENV ?? "development",
      objectiveLength: objective.length,
    });

    const result = await withTimeout(
      (async () => {
        assertWithinDeadline(startedAt, timeoutMs);

        const scanResult = await engine.autopilotScan(
          workspacePath,
          MaestroMode.EXECUTE,
          objective
        );

        assertWithinDeadline(startedAt, timeoutMs);

        const executionRunId = await engine.executeJobs(
          scanResult.project.id,
          scanResult.jobs,
          undefined,
          scanResult.plan,
          scanResult.tenantId
        );

        return {
          ...scanResult,
          executionRunId,
        };
      })(),
      timeoutMs
    );

    const durationMs = Date.now() - startedAt;

    appLogger.info("maestro.run.completed", {
      requestId,
      durationMs,
      runId: result.runId,
      executionRunId: result.executionRunId,
    });

    return apiOk({
      requestId,
      durationMs,
      result: {
        ...result,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    const status = isTimeout ? 504 : 500;

    appLogger.error("maestro.run.failed", {
      requestId,
      durationMs,
      status,
      errorName: error instanceof Error ? error.name : "UnknownError",
      message,
    });

    return apiError(
      isTimeout ? "Execução do Maestro excedeu o tempo limite." : "Falha ao executar Maestro.",
      status,
      {
        code: isTimeout ? "RUN_TIMEOUT" : "RUN_FAILED",
        requestId,
        durationMs,
        message,
      }
    );
  }
}
