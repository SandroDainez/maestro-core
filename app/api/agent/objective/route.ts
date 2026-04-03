import { NextResponse } from "next/server";
import { AgentExecutor } from "@/src/agents/AgentExecutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REQUEST_TIMEOUT_MS = 55_000;

function validateObjective(body: unknown) {
  if (!body || typeof body !== "object") return "";
  if (typeof (body as { objective?: unknown }).objective !== "string") return "";
  const value = (body as { objective?: string }).objective?.trim();
  return value ? value : "";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const objective = validateObjective(body);

  if (!objective) {
    return NextResponse.json(
      { error: "Objetivo inválido" },
      { status: 400 }
    );
  }

  try {
    const executor = new AgentExecutor();
    const context =
      body && typeof body === "object" ? (body as { context?: unknown }).context : undefined;
    const result = await Promise.race([
      executor.execute(objective, context as { [key: string]: unknown } | undefined),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), REQUEST_TIMEOUT_MS)
      ),
    ]);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("Agent executor error:", error);
    const message =
      error instanceof Error && error.message === "timeout"
        ? "Tempo limite atingido"
        : error instanceof Error
        ? error.message
        : "Erro ao executar objetivo";
    return NextResponse.json(
      { error: message },
      { status: message === "Tempo limite atingido" ? 504 : 500 }
    );
  }
}
