// Neon + Vercel: DIRECT_URL yerine DATABASE_URL_UNPOOLED gelebilir
if (!process.env.DIRECT_URL) {
  const fallback =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;

  if (fallback) {
    process.env.DIRECT_URL = fallback;
  }
}
