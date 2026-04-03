import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { authorizeAdmin } from "@/src/lib/admin";
import { apiError, apiOk } from "@/src/lib/api";

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const DeleteUserSchema = z.object({
  reason: z.string().min(1),
});

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const payload = await req.json().catch(() => null);
  const parsed = UpdateUserSchema.safeParse(payload);

  if (!parsed.success) {
    return apiError("Payload inválido para atualização do usuário.", 400);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return apiOk({ user: updated });
  } catch (error) {
    console.error("PUT /api/users/" + params.id, error);
    return apiError("Falha ao atualizar o usuário.", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const payload = await _req.json().catch(() => null);
  const parsed = DeleteUserSchema.safeParse(payload);

  if (!parsed.success) {
    return apiError("Informe o motivo da remoção.", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return apiError("Usuário não encontrado.", 404);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: params.id } });
      await tx.deletionAudit.create({
        data: {
          userId: params.id,
          userEmail: user.email,
          reason: parsed.data.reason,
          performedBy: auth.session.user?.email ?? "admin",
          targetType: "user",
        },
      });
    });
    return apiOk({});
  } catch (error) {
    console.error("DELETE /api/users/" + params.id, error);
    return apiError("Falha ao remover o usuário.", 500);
  }
}
