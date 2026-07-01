/** Neon + Vercel ortam değişkenlerini Prisma'nın beklediği isimlere eşler. */
export function ensureDatabaseEnv() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL;
  }

  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL =
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL;
  }
}
