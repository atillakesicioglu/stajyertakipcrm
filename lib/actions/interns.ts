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

export type ActionResult = { ok: boolean; error?: string };

export async function createIntern(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
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
        role: "INTERN",
        passwordHash: createUnsetPasswordHash(),
      },
    });
  } catch (e) {
    console.error("Stajyer oluşturulamadı:", e);
    return {
      ok: false,
      error: "Stajyer kaydedilemedi. Lütfen tekrar deneyin.",
    };
  }

  await logActivity(
    admin.id,
    "CREATE_INTERN",
    "/stajyerler",
    `${name} (${email}) stajyer olarak eklendi`
  );

  revalidatePath("/stajyerler");
  revalidatePath("/ofis-isleri");
  return { ok: true };
}

export async function deleteIntern(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const intern = await prisma.user.findUnique({ where: { id } });
  if (!intern || intern.role !== "INTERN") return;

  await prisma.user.delete({ where: { id } });

  await logActivity(
    admin.id,
    "DELETE_INTERN",
    "/stajyerler",
    `${intern.name} (${intern.email}) silindi`
  );

  revalidatePath("/stajyerler");
  revalidatePath("/ofis-isleri");
}

export async function resetInternPassword(
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Geçersiz stajyer." };

  const intern = await prisma.user.findUnique({ where: { id } });
  if (!intern || intern.role !== "INTERN") {
    return { ok: false, error: "Geçersiz stajyer." };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { passwordHash: createUnsetPasswordHash() },
    });
  } catch (e) {
    console.error("Şifre sıfırlanamadı:", e);
    return { ok: false, error: "Şifre sıfırlanamadı. Lütfen tekrar deneyin." };
  }

  await logActivity(
    admin.id,
    "RESET_INTERN_PASSWORD",
    "/stajyerler",
    `${intern.name} (${intern.email}) şifresi sıfırlandı`
  );

  revalidatePath("/stajyerler");
  return { ok: true };
}
