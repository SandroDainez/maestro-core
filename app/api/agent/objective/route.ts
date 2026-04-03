import { NextResponse } from "next/server";
import { AgentExecutor } from "@/src/agents/AgentExecutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.objective !== "string" || !body.objective.trim()) {
    return NextResponse.json(
      { error: "Objetivo inválido" },
      { status: 400 }
    );
  }

  try {
    const executor = new AgentExecutor();
    const result = await executor.execute(body.objective, body.context);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("Agent executor error:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao executar objetivo" },
      { status: 500 }
    );
  }
}
