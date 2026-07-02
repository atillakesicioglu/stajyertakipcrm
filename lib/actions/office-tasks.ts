"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { toDateOnly, isSameDateOnly } from "@/lib/date";

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

const assignSchema = z.object({
  userId: z.string().min(1),
  officeTaskId: z.string().min(1),
  date: z.string().min(1),
});

/** Admin: stajyere belirli gün için görev atar (aynı gün tek görev / görev tek kişi). */
export async function assignOfficeTask(
  formData: FormData
): Promise<OfficeActionResult> {
  const admin = await requireAdmin();

  const parsed = assignSchema.safeParse({
    userId: formData.get("userId"),
    officeTaskId: formData.get("officeTaskId"),
    date: formData.get("date"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Geçersiz atama bilgisi." };
  }

  const { userId, officeTaskId, date: dateStr } = parsed.data;
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const [intern, task] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } }),
    prisma.officeTask.findUnique({ where: { id: officeTaskId }, select: { id: true, title: true } }),
  ]);

  if (!intern || intern.role !== "INTERN") {
    return { ok: false, error: "Geçersiz stajyer." };
  }
  if (!task) return { ok: false, error: "Geçersiz görev." };

  await prisma.$transaction([
    prisma.officeTaskAssignment.deleteMany({ where: { userId, date } }),
    prisma.officeTaskAssignment.deleteMany({ where: { officeTaskId, date } }),
    prisma.officeTaskAssignment.create({
      data: { userId, officeTaskId, date },
    }),
  ]);

  await logActivity(
    admin.id,
    "ASSIGN_OFFICE_TASK",
    "/ofis-isleri",
    `${intern.name} → "${task.title}" (${dateStr})`
  );

  revalidatePath("/ofis-isleri");
  return { ok: true };
}

/** Admin: atamayı kaldırır. */
export async function unassignOfficeTask(
  formData: FormData
): Promise<OfficeActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Geçersiz atama." };

  const assignment = await prisma.officeTaskAssignment.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      officeTask: { select: { title: true } },
    },
  });

  if (!assignment) return { ok: false, error: "Atama bulunamadı." };

  await prisma.officeTaskAssignment.delete({ where: { id } });

  await logActivity(
    admin.id,
    "UNASSIGN_OFFICE_TASK",
    "/ofis-isleri",
    `${assignment.user.name} ← "${assignment.officeTask.title}"`
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

  if (!assignment || !isSameDateOnly(assignment.date, today)) {
    return { ok: false, error: "Bu atama bulunamadı." };
  }

  if (user.role === "INTERN") {
    if (assignment.userId !== user.id) {
      return { ok: false, error: "Bu iş size atanmamış." };
    }
    if (assignment.completed) {
      return { ok: false, error: "Tamamlanan görev geri alınamaz." };
    }
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
