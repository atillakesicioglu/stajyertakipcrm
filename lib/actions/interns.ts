"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";

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
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
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
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Bu e-posta zaten kayıtlı." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const intern = await prisma.user.create({
    data: { name, email, passwordHash, role: "INTERN" },
  });

  await logActivity(
    admin.id,
    "CREATE_INTERN",
    "/stajyerler",
    `${name} (${email}) stajyer olarak eklendi`
  );

  revalidatePath("/stajyerler");
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
}
