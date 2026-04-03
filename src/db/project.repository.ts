import { prisma } from "./prisma";

export class ProjectRepository {
  async upsertByPath(tenantId: string, path: string) {
    const slug = path.replace(/[^\w]+/g, "-").toLowerCase();

    return prisma.project.upsert({
      where: { slug },
      update: {
        path,
        tenantId,
      },
      create: {
        tenantId,
        slug,
        name: slug,
        path,
        status: "active",
      },
    });
  }
}
