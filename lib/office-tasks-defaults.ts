import { prisma } from "@/lib/prisma";

/** Sabit ofis görevleri — sütun sırası bu diziye göre belirlenir. */
export const DEFAULT_OFFICE_TASKS = [
  "Su",
  "Temizlik",
  "Çay",
  "Bulaşık",
  "Çöp Atma",
] as const;

export type DefaultOfficeTaskTitle = (typeof DEFAULT_OFFICE_TASKS)[number];

export async function ensureDefaultOfficeTasks(): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!admin) return;

  const existing = await prisma.officeTask.findMany({
    where: { title: { in: [...DEFAULT_OFFICE_TASKS] } },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((t) => t.title));

  for (const title of DEFAULT_OFFICE_TASKS) {
    if (!existingTitles.has(title)) {
      await prisma.officeTask.create({
        data: {
          title,
          createdById: admin.id,
          active: true,
        },
      });
    }
  }
}

export async function getOrderedOfficeTasks() {
  await ensureDefaultOfficeTasks();

  const tasks = await prisma.officeTask.findMany({
    where: {
      active: true,
      title: { in: [...DEFAULT_OFFICE_TASKS] },
    },
    select: { id: true, title: true },
  });

  return DEFAULT_OFFICE_TASKS.map((title) =>
    tasks.find((t) => t.title === title)
  ).filter((t): t is { id: string; title: string } => !!t);
}
