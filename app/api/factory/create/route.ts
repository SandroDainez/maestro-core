import { NextResponse } from "next/server";
import { z } from "zod";
import { createSaaSProject } from "@/src/lib/factory/createProject";

const BodySchema = z.object({
  name: z.string().min(3)
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await createSaaSProject({
    name: parsed.data.name,
    basePath: "/Users/sandrodainez/projects"
  });

  return NextResponse.json(result);
}
