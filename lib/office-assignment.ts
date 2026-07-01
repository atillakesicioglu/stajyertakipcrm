import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/date";

/**
 * Bugün için aktif ofis işlerini stajyerlere eşit dağıtır.
 * Aynı iş bir stajyere arka arkaya iki gün verilmez.
 */
export async function ensureTodayOfficeAssignments(): Promise<void> {
  const today = toDateOnly(new Date());
  const yesterday = toDateOnly(
    new Date(today.getTime() - 24 * 60 * 60 * 1000)
  );

  const [activeTasks, interns] = await Promise.all([
    prisma.officeTask.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "INTERN" },
      orderBy: { name: "asc" },
      select: { id: true },
    }),
  ]);

  if (activeTasks.length === 0 || interns.length === 0) return;

  const [existingToday, yesterdayAssignments] = await Promise.all([
    prisma.officeTaskAssignment.findMany({
      where: {
        date: today,
        officeTaskId: { in: activeTasks.map((t) => t.id) },
      },
    }),
    prisma.officeTaskAssignment.findMany({
      where: {
        date: yesterday,
        officeTaskId: { in: activeTasks.map((t) => t.id) },
      },
      select: { officeTaskId: true, userId: true },
    }),
  ]);

  const assignedTaskIds = new Set(existingToday.map((a) => a.officeTaskId));
  const tasksNeedingAssignment = activeTasks.filter(
    (t) => !assignedTaskIds.has(t.id)
  );

  if (tasksNeedingAssignment.length === 0) return;

  const yesterdayByTask = new Map(
    yesterdayAssignments.map((a) => [a.officeTaskId, a.userId])
  );

  const todayCount = new Map<string, number>();
  for (const intern of interns) todayCount.set(intern.id, 0);
  for (const a of existingToday) {
    todayCount.set(a.userId, (todayCount.get(a.userId) ?? 0) + 1);
  }

  const toCreate: {
    officeTaskId: string;
    userId: string;
    date: Date;
  }[] = [];

  for (const task of tasksNeedingAssignment) {
    const yesterdayUserId = yesterdayByTask.get(task.id);

    const sorted = [...interns].sort(
      (a, b) => (todayCount.get(a.id) ?? 0) - (todayCount.get(b.id) ?? 0)
    );

    const chosen =
      sorted.find((i) => i.id !== yesterdayUserId) ?? sorted[0];

    toCreate.push({
      officeTaskId: task.id,
      userId: chosen.id,
      date: today,
    });
    todayCount.set(chosen.id, (todayCount.get(chosen.id) ?? 0) + 1);
  }

  await prisma.officeTaskAssignment.createMany({ data: toCreate });
}
