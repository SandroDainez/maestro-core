import { z } from "zod";
import { cloneToSandbox } from "@/src/lib/factory/cloneSandboxProject";
import { apiError, apiOk } from "@/src/lib/api";
import { getAppTmpRoot, isVercelRuntime } from "@/src/lib/server/paths";

export const runtime = "nodejs";

const BodySchema = z.object({
  sourcePath: z.string()
});

export async function POST(req: Request) {
  if (isVercelRuntime()) {
    return apiError("Sandbox local não é suportado em ambiente Vercel serverless.", 501, {
      code: "SANDBOX_UNSUPPORTED_ON_VERCEL",
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: "INVALID_BODY" });
  }

  const result = await cloneToSandbox({
    sourcePath: parsed.data.sourcePath,
    sandboxBasePath: getAppTmpRoot()
  });

  return apiOk({ result });
}
