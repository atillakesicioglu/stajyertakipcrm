"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { createUnsetPasswordHash } from "@/lib/password";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return session.user;
}

const createSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalı."),
  email: z.string().email("Geçerli bir e-posta girin."),
});

export type AdminActionResult = { ok: boolean; error?: string; message?: string };

export async function createAdmin(
  _prev: AdminActionResult | undefined,
  formData: FormData
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { name, email } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Bu e-posta zaten kayıtlı." };
  }

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        role: "ADMIN",
        passwordHash: createUnsetPasswordHash(),
      },
    });
  } catch (e) {
    console.error("Yönetici oluşturulamadı:", e);
    return {
      ok: false,
      error: "Yönetici kaydedilemedi. Lütfen tekrar deneyin.",
    };
  }

  await logActivity(
    admin.id,
    "CREATE_ADMIN",
    "/ayarlar",
    `${name} (${email}) yönetici olarak eklendi`
  );

  revalidatePath("/ayarlar");
  return {
    ok: true,
    message: `${name} yönetici olarak eklendi. İlk girişte şifre belirleyecek.`,
  };
}
