"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { uploadScreenshot } from "@/lib/blob";
import { createNotification } from "@/lib/actions/notifications";

export type TaskActionResult = { ok: boolean; error?: string };

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
  title: z.string().min(2, "Başlık en az 2 karakter olmalı."),
  description: z.string().min(1, "Açıklama gerekli."),
  assignedToId: z.string().min(1, "Stajyer seçin."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().optional(),
});

export async function assignTask(
  _prev: TaskActionResult | undefined,
  formData: FormData
): Promise<TaskActionResult> {
  const admin = await requireAdmin();

  const parsed = assignSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assignedToId: formData.get("assignedToId"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { title, description, assignedToId, priority, dueDate } = parsed.data;

  const intern = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!intern || intern.role !== "INTERN") {
    return { ok: false, error: "Geçersiz stajyer." };
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      assignedToId,
      createdById: admin.id,
      priority: priority as Priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  await createNotification({
    userId: assignedToId,
    type: "TASK_ASSIGNED",
    title: "Yeni iş atandı",
    message: `Size "${title}" işi atandı.`,
    relatedTaskId: task.id,
  });

  await logActivity(
    admin.id,
    "ASSIGN_TASK",
    "/isler",
    `${intern.name} kişisine "${title}" işi atandı`
  );

  revalidatePath("/isler");
  return { ok: true };
}

export async function startTask(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.assignedToId !== user.id) return;
  if (task.status !== "ASSIGNED" && task.status !== "REVISION_REQUESTED") return;

  await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    }),
    prisma.taskStart.create({
      data: { taskId: id },
    }),
  ]);

  await logActivity(
    user.id,
    "START_TASK",
    "/isler",
    `"${task.title}" işine başladı`
  );

  revalidatePath("/isler");
}

export async function submitTask(
  _prev: TaskActionResult | undefined,
  formData: FormData
): Promise<TaskActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const textContent = String(formData.get("textContent") ?? "").trim();
  const file = formData.get("screenshot") as File | null;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.assignedToId !== user.id) {
    return { ok: false, error: "İş bulunamadı." };
  }
  if (task.status !== "IN_PROGRESS" && task.status !== "REVISION_REQUESTED") {
    return { ok: false, error: "Bu iş şu anda teslim edilemez." };
  }

  const hasFile = file && file.size > 0;
  if (!textContent && !hasFile) {
    return {
      ok: false,
      error: "Lütfen bir açıklama yazın veya ekran görüntüsü yükleyin.",
    };
  }

  let screenshotUrl: string | undefined;
  let screenshotName: string | undefined;

  if (hasFile) {
    try {
      const result = await uploadScreenshot(file);
      screenshotUrl = result.url;
      screenshotName = result.name;
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Dosya yüklenemedi.",
      };
    }
  }

  await prisma.taskSubmission.create({
    data: {
      taskId: id,
      textContent: textContent || null,
      screenshotUrl,
      screenshotName,
    },
  });

  await prisma.task.update({
    where: { id },
    data: { status: "SUBMITTED" },
  });

  await createNotification({
    userId: task.createdById,
    type: "TASK_SUBMITTED",
    title: "İş teslim edildi",
    message: `"${task.title}" işi onayınıza sunuldu.`,
    relatedTaskId: task.id,
  });

  await logActivity(
    user.id,
    "SUBMIT_TASK",
    "/isler",
    `"${task.title}" işini teslim etti`
  );

  revalidatePath("/isler");
  return { ok: true };
}

export async function approveTask(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.status !== "SUBMITTED") return;

  await prisma.task.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  await createNotification({
    userId: task.assignedToId,
    type: "TASK_APPROVED",
    title: "İş onaylandı",
    message: `"${task.title}" işiniz onaylandı.`,
    relatedTaskId: task.id,
  });

  await logActivity(
    admin.id,
    "APPROVE_TASK",
    "/isler",
    `"${task.title}" işini onayladı`
  );

  revalidatePath("/isler");
}

const revisionSchema = z.object({
  id: z.string().min(1),
  note: z.string().min(1, "Revize notu gerekli."),
});

export async function requestRevision(
  _prev: TaskActionResult | undefined,
  formData: FormData
): Promise<TaskActionResult> {
  const admin = await requireAdmin();

  const parsed = revisionSchema.safeParse({
    id: formData.get("id"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { id, note } = parsed.data;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.status !== "SUBMITTED") {
    return { ok: false, error: "Bu iş için revize istenemez." };
  }

  await prisma.taskRevision.create({
    data: { taskId: id, note, createdById: admin.id },
  });

  await prisma.task.update({
    where: { id },
    data: { status: "REVISION_REQUESTED" },
  });

  await createNotification({
    userId: task.assignedToId,
    type: "TASK_REVISION",
    title: "Revize istendi",
    message: `"${task.title}" işi için revize istendi.`,
    relatedTaskId: task.id,
  });

  await logActivity(
    admin.id,
    "REQUEST_REVISION",
    "/isler",
    `"${task.title}" işi için revize istedi`
  );

  revalidatePath("/isler");
  return { ok: true };
}
