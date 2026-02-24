import { NextResponse } from "next/server";
import { z } from "zod";
import { executePipeline } from "@/src/lib/runner/pipelineExecutor";

const BodySchema = z.object({
  runId: z.string().uuid(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { runId } = parsed.data;

  executePipeline(runId).catch(console.error);

  return NextResponse.json({ ok: true });
}
