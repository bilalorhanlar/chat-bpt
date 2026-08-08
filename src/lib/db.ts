import { PrismaClient } from "@prisma/client";

/**
 * Prisma istemcisi tek örnek.
 *
 * Geliştirmede Next her sıcak yüklemede modülleri yeniden değerlendiriyor;
 * global'e tutunmazsak her düzenlemede yeni bir bağlantı havuzu açılır ve
 * Postgres kısa sürede "too many connections" der.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
