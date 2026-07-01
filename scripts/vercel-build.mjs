import "./setup-prisma-env.mjs";
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  console.error(
    "Hata: Veritabanı bağlantısı bulunamadı. Vercel'de POSTGRES_PRISMA_URL ve POSTGRES_URL_NON_POOLING tanımlı olmalı."
  );
  process.exit(1);
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

run("npx prisma generate");
run("npx next build");
