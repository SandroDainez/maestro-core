import { prisma } from "@/src/lib/prisma";
import { removeDir } from "@/src/utils/fsx";
import path from "path";
import { apiError, apiOk } from "@/src/lib/api";
import { authorizeAdmin } from "@/src/lib/admin";
import { getAgentExecutionsRoot } from "@/src/lib/server/paths";

export const runtime = "nodejs";

const AGENT_ROOT = getAgentExecutionsRoot();

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const body = await _req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return apiError("Informe o motivo da exclusão do projeto.", 400);
  }

  const project = await prisma.project.findFirst({
    where: { slug: params.id },
  });

  if (!project) {
    return apiError("Projeto não encontrado", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.pipelinePhaseRun.deleteMany({
      where: { run: { projectId: project.id } },
    });
    await tx.pipelineRun.deleteMany({ where: { projectId: project.id } });
    await tx.project.delete({ where: { id: project.id } });
    await tx.deletionAudit.create({
      data: {
        projectId: project.id,
        projectSlug: project.slug,
        performedBy: auth.session.user?.email ?? "admin",
        reason,
        targetType: "project",
      },
    });
  });

  await removeDir(path.join(AGENT_ROOT, project.slug));

  return apiOk({});
}
