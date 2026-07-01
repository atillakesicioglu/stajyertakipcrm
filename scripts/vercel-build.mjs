import "./setup-prisma-env.mjs";
import { execSync } from "node:child_process";

if (!process.env.DIRECT_URL) {
  console.error(
    "Hata: Veritabanı bağlantısı bulunamadı. Vercel'de DATABASE_URL veya DATABASE_URL_UNPOOLED tanımlı olmalı."
  );
  process.exit(1);
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

run("npx prisma generate");
run("npx prisma migrate deploy");
run("npx next build");
