import { prisma } from "@/lib/prisma";

/** Varsayılan ofis görevleri — tabloda önce bu sırayla gelir. */
export const DEFAULT_OFFICE_TASKS = [
  "Su",
  "Temizlik",
  "Çay",
  "Bulaşık",
  "Çöp Atma",
] as const;

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
        data: { title, createdById: admin.id, active: true },
      });
    }
  }
}

export async function getOrderedOfficeTasks() {
  await ensureDefaultOfficeTasks();

  const tasks = await prisma.officeTask.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });

  const defaultOrder = new Map(
    DEFAULT_OFFICE_TASKS.map((title, index) => [title, index])
  );

  return tasks.sort((a, b) => {
    const ai = defaultOrder.get(a.title as (typeof DEFAULT_OFFICE_TASKS)[number]);
    const bi = defaultOrder.get(b.title as (typeof DEFAULT_OFFICE_TASKS)[number]);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.title.localeCompare(b.title, "tr");
  });
}
