import { prisma } from "@/src/lib/prisma";
import { authorizeAdmin } from "@/src/lib/admin";
import { apiOk } from "@/src/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;
  console.log("GET /api/users authorized", auth.session.user?.email);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return apiOk({ users });
}
