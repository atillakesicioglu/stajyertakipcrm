"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { toDateOnly, isSameDateOnly } from "@/lib/date";
import { mailOfficeTaskAssignedToIntern } from "@/lib/notification-mail-events";

export type OfficeActionResult = {
  ok: boolean;
  error?: string;
  task?: { id: string; title: string };
};

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

const createTaskSchema = z.object({
  title: z.string().min(2, "Görev adı en az 2 karakter olmalı."),
});

export async function createOfficeTask(
  _prev: OfficeActionResult | undefined,
  formData: FormData
): Promise<OfficeActionResult> {
  const admin = await requireAdmin();

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { title } = parsed.data;

  const existing = await prisma.officeTask.findFirst({
    where: { title: { equals: title, mode: "insensitive" } },
    select: { id: true, active: true },
  });

  if (existing?.active) {
    return { ok: false, error: "Bu görev zaten mevcut." };
  }

  let taskId: string;

  if (existing) {
    await prisma.officeTask.update({
      where: { id: existing.id },
      data: { active: true, createdById: admin.id },
    });
    taskId = existing.id;
  } else {
    const created = await prisma.officeTask.create({
      data: { title, createdById: admin.id, active: true },
      select: { id: true },
    });
    taskId = created.id;
  }

  after(() => {
    logActivity(
      admin.id,
      "CREATE_OFFICE_TASK",
      "/ofis-isleri",
      `"${title}" günlük görev eklendi`
    );
    revalidatePath("/ofis-isleri");
    revalidatePath("/isler");
  });

  return { ok: true, task: { id: taskId, title } };
}

export async function deleteOfficeTask(
  formData: FormData
): Promise<OfficeActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Geçersiz görev." };

  const task = await prisma.officeTask.findUnique({ where: { id } });
  if (!task) return { ok: false, error: "Görev bulunamadı." };

  await prisma.$transaction([
    prisma.officeTaskAssignment.deleteMany({ where: { officeTaskId: id } }),
    prisma.officeTask.update({
      where: { id },
      data: { active: false },
    }),
  ]);

  after(() => {
    logActivity(
      admin.id,
      "DELETE_OFFICE_TASK",
      "/ofis-isleri",
      `"${task.title}" günlük görev silindi`
    );
    revalidatePath("/ofis-isleri");
    revalidatePath("/isler");
  });

  return { ok: true };
}

/** Admin: stajyere belirli gün için görev atar. */
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
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    }),
    prisma.officeTask.findUnique({
      where: { id: officeTaskId },
      select: { id: true, title: true },
    }),
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

  void mailOfficeTaskAssignedToIntern({
    userId,
    taskTitle: task.title,
    date,
  });

  revalidatePath("/ofis-isleri");
  return { ok: true };
}

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

  await prisma.officeTaskAssignment.update({
    where: { id },
    data: { completed: true, completedAt: new Date() },
  });

  if (user.role === "INTERN") {
    await logActivity(
      user.id,
      "COMPLETE_OFFICE_TASK",
      "/ofis-isleri",
      `"${assignment.officeTask.title}" işini tamamladı`
    );
  }

  revalidatePath("/ofis-isleri");
  return { ok: true };
}
