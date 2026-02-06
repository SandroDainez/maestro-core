import { prisma } from "./prisma";

export class TenantRepository {
  async ensureDefaultTenant() {
    const slug = "default";

    return prisma.tenant.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
      },
    });
  }
}

