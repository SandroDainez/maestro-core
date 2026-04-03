import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { apiError } from "./api";
import { isAdminRole } from "./rbac";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@maestro.com";

export async function authorizeAdmin() {
  const session = await getServerSession(authOptions);

  const isFallbackAdmin = session?.user?.email === ADMIN_EMAIL;
  const hasAdminRole = isAdminRole((session?.user as any)?.role);

  if (!session || (!hasAdminRole && !isFallbackAdmin)) {
    return {
      ok: false,
      response: apiError(
        "Acesso negado. Faça login como administrador para continuar.",
        401
      ),
    } as const;
  }

  return { ok: true, session } as const;
}
