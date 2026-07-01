import { ensureDatabaseEnv } from "@/lib/env";
import { PrismaClient } from "@prisma/client";

ensureDatabaseEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Serverless ortamda bağlantı havuzunu korumak için production'da da önbelleğe al
globalForPrisma.prisma = prisma;
