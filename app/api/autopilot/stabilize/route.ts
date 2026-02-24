import { NextResponse } from "next/server";
import { z } from "zod";
import { scanProject } from "@/src/lib/scan/scanProject";
import { generateStabilizationPlan } from "@/src/lib/analysis/generatePlan";
import { executeStabilization } from "@/src/lib/runner/executeStabilization";

const BodySchema = z.object({
  path: z.string()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const scan = await scanProject(parsed.data.path);
  const plan = generateStabilizationPlan(scan);

  const execution = await executeStabilization(parsed.data.path, plan);

  return NextResponse.json({
    scan,
    plan,
    execution
  });
}
