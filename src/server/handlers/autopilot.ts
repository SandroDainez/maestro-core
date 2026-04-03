import { z } from "zod";
import { apiError, apiOk } from "../../lib/api";

const ScanBodySchema = z.object({
  path: z.string().min(1),
});

const RunBodySchema = z.object({
  path: z.string().min(1),
  autoExecute: z.boolean().optional().default(true),
  approved: z.boolean().optional().default(false),
  approvedPhases: z.array(z.string().min(1)).optional().default([]),
  actor: z.string().optional().default("api"),
});

type AutopilotScanRunner = {
  scanProject(path: string): Promise<unknown>;
};

type AutopilotRunRunner = {
  runProject(
    path: string,
    autoExecute: boolean,
    approved?: boolean,
    approvedPhases?: string[],
    actor?: string
  ): Promise<unknown>;
};

export async function handleAutopilotScanRequest(
  req: Request,
  orchestrator: AutopilotScanRunner
) {
  const body = await req.json().catch(() => null);
  const parsed = ScanBodySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid body", 400);
  }

  const result = await orchestrator.scanProject(parsed.data.path);
  return apiOk({ result });
}

export async function handleAutopilotRunRequest(
  req: Request,
  orchestrator: AutopilotRunRunner
) {
  const body = await req.json().catch(() => null);
  const parsed = RunBodySchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Body invalido. Envie ao menos { path }.", 400);
  }

  try {
    const result = await orchestrator.runProject(
      parsed.data.path,
      parsed.data.autoExecute,
      parsed.data.approved,
      parsed.data.approvedPhases,
      parsed.data.actor
    );
    return apiOk({ result });
  } catch (error) {
    console.error("Erro no autopilot/run:", error);
    return apiError("Erro ao criar execucao do autopilot", 500);
  }
}
