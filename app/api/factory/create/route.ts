import { z } from "zod";
import { createSaaSProject } from "@/src/lib/factory/createProject";
import { apiError, apiOk } from "@/src/lib/api";
import { getAppTmpRoot, isVercelRuntime } from "@/src/lib/server/paths";

export const runtime = "nodejs";

const BodySchema = z.object({
  name: z.string().min(3)
});

export async function POST(req: Request) {
  if (isVercelRuntime()) {
    return apiError("Factory de projetos não é suportada em ambiente Vercel serverless.", 501, {
      code: "FACTORY_UNSUPPORTED_ON_VERCEL",
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: "INVALID_BODY" });
  }

  const result = await createSaaSProject({
    name: parsed.data.name,
    basePath: getAppTmpRoot()
  });

  return apiOk({ result });
}
