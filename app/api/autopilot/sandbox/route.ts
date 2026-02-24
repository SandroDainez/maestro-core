import { NextResponse } from "next/server";
import { z } from "zod";
import { cloneToSandbox } from "@/src/lib/factory/cloneSandboxProject";

const BodySchema = z.object({
  sourcePath: z.string()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await cloneToSandbox({
    sourcePath: parsed.data.sourcePath,
    sandboxBasePath: "/Users/sandrodainez/Projetos/sandbox"
  });

  return NextResponse.json(result);
}
