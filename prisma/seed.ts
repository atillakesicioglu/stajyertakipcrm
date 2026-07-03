import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_TASK_STATUS_CONFIG } from "../lib/app-settings-defaults";

const prisma = new PrismaClient();

async function main() {
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      taskStatusConfig: DEFAULT_TASK_STATUS_CONFIG,
    },
  });
  console.log("Uygulama ayarları hazır.");

  const email = process.env.ADMIN_EMAIL ?? "admin@firma.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";
  const name = process.env.ADMIN_NAME ?? "Yönetici";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin zaten mevcut: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Admin oluşturuldu: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
