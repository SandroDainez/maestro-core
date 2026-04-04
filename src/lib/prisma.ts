import { PrismaClient } from "@prisma/client";
import { getDatabaseConfig, sanitizeDatabaseUrl } from "./config";

const { url, mode } = getDatabaseConfig();
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

console.info(`[db] Prisma client initialized (${mode} mode) - ${sanitizeDatabaseUrl(url)}`);
