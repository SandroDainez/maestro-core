import { prisma } from "./prisma";

export class ProjectRepository {
  static async create(data: {
    slug: string;
    name: string;
    path: string;
    tenantId: string;
  }) {
    return prisma.project.create({ data });
  }

  static async getById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  }

  static async listByTenant(tenantId: string) {
    return prisma.project.findMany({
      where: { tenantId },
      orderBy: { id: "desc" },
    });
  }

  static async setActive(projectId: string) {
    await prisma.project.updateMany({ data: { status: "created" } });

    return prisma.project.update({
      where: { id: projectId },
      data: { status: "active" },
    });
  }

  static async getActive() {
    return prisma.project.findFirst({
      where: { status: "active" },
    });
  }

  static async ensureLastUsed(tenantId: string) {
    const active = await prisma.project.findFirst({
      where: { tenantId, status: "active" },
    });

    if (active) return active;

    return prisma.project.findFirst({
      where: { tenantId },
      orderBy: { id: "desc" },
    });
  }
}

