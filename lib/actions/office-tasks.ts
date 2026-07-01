"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { toDateOnly } from "@/lib/date";

export type OfficeActionResult = { ok: boolean; error?: string };

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Oturum bulunamadı.");
  return session.user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Bu işlem için yetkiniz yok.");
  return user;
}

const createSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalı."),
  description: z.string().optional(),
});

export async function createOfficeTask(
  _prev: OfficeActionResult | undefined,
  formData: FormData
): Promise<OfficeActionResult> {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { title, description } = parsed.data;

  await prisma.officeTask.create({
    data: {
      title,
      description: description || null,
      createdById: admin.id,
    },
  });

  await logActivity(
    admin.id,
    "CREATE_OFFICE_TASK",
    "/ofis-isleri",
    `"${title}" ofis işi eklendi`
  );

  revalidatePath("/ofis-isleri");
  return { ok: true };
}

export async function deleteOfficeTask(
  formData: FormData
): Promise<OfficeActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Geçersiz iş." };

  const task = await prisma.officeTask.findUnique({ where: { id } });
  if (!task) return { ok: false, error: "İş bulunamadı." };

  await prisma.officeTask.delete({ where: { id } });

  await logActivity(
    admin.id,
    "DELETE_OFFICE_TASK",
    "/ofis-isleri",
    `"${task.title}" ofis işi silindi`
  );

  revalidatePath("/ofis-isleri");
  return { ok: true };
}

export async function toggleOfficeAssignment(
  formData: FormData
): Promise<OfficeActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Geçersiz atama." };

  const today = toDateOnly(new Date());

  const assignment = await prisma.officeTaskAssignment.findUnique({
    where: { id },
    include: { officeTask: true },
  });

  if (!assignment || assignment.date.getTime() !== today.getTime()) {
    return { ok: false, error: "Bu atama bulunamadı." };
  }

  if (user.role === "INTERN" && assignment.userId !== user.id) {
    return { ok: false, error: "Bu iş size atanmamış." };
  }

  const completed = !assignment.completed;

  await prisma.officeTaskAssignment.update({
    where: { id },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  if (user.role === "INTERN") {
    await logActivity(
      user.id,
      completed ? "COMPLETE_OFFICE_TASK" : "UNCOMPLETE_OFFICE_TASK",
      "/ofis-isleri",
      `"${assignment.officeTask.title}" işini ${completed ? "tamamladı" : "geri aldı"}`
    );
  }

  revalidatePath("/ofis-isleri");
  return { ok: true };
}
