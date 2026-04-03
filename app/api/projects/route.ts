import { prisma } from "@/src/lib/prisma";
import { apiOk } from "@/src/lib/api";
import { authorizeAdmin } from "@/src/lib/admin";

export async function GET() {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      name: true,
    },
  });

  return apiOk({ projects });
}
