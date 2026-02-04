// src/db/tenant.repository.ts

import { prisma } from "./prisma";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export class TenantRepository {
  static async ensureDefault() {
    const existing = await prisma.tenant.findUnique({
      where: { slug: "default" },
    });

    if (existing) return existing;

    return prisma.tenant.create({
      data: {
        name: "Default",
        slug: "default",
      },
    });
  }

  static async create(name: string) {
    const slug = slugify(name);

    const existing = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existing) return existing;

    return prisma.tenant.create({
      data: { name, slug },
    });
  }

  static async list() {
    return prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  static async findBySlug(slug: string) {
    return prisma.tenant.findUnique({
      where: { slug },
    });
  }

  static async findById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
    });
  }
}

