import { prisma } from "@/lib/prisma";
import { isSameDateOnly } from "@/lib/date";

type TaskRef = { id: string };
type InternRef = { id: string };

type PlannedCell = {
  userId: string;
  officeTaskId: string;
  date: Date;
};

/**
 * Haftalık plan: her stajyer her gün farklı bir iş yapar (5 günde 5 farklı iş).
 * Aynı gün iki stajyer aynı işe atanmaz. Tamamlanmamış atamalar her yüklemede yenilenir.
 */
export async function ensureWeeklyOfficeAssignments(
  weekDates: Date[],
  tasks: TaskRef[],
  interns: InternRef[]
): Promise<void> {
  if (interns.length === 0 || tasks.length === 0 || weekDates.length === 0) {
    return;
  }

  const existing = await prisma.officeTaskAssignment.findMany({
    where: { date: { in: weekDates } },
    select: {
      id: true,
      officeTaskId: true,
      date: true,
      userId: true,
      completed: true,
    },
  });

  const locked = existing.filter((a) => a.completed);

  await prisma.officeTaskAssignment.deleteMany({
    where: {
      date: { in: weekDates },
      completed: false,
    },
  });

  const planned: PlannedCell[] = [];

  for (let dayIndex = 0; dayIndex < weekDates.length; dayIndex++) {
    const date = weekDates[dayIndex]!;
    const dayLocked = locked.filter((a) => isSameDateOnly(a.date, date));

    const usedInternIds = new Set(dayLocked.map((a) => a.userId));
    const usedTaskIds = new Set(dayLocked.map((a) => a.officeTaskId));

    for (const lock of dayLocked) {
      usedInternIds.add(lock.userId);
      usedTaskIds.add(lock.officeTaskId);
    }

    if (interns.length >= tasks.length) {
      // Her görev sütununa bir stajyer (yeterli stajyer varsa tüm görevler dolu)
      for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
        const task = tasks[taskIndex]!;
        if (usedTaskIds.has(task.id)) continue;

        const startIdx = (taskIndex + dayIndex) % interns.length;
        const intern = pickIntern(interns, usedInternIds, startIdx);
        if (!intern) continue;

        planned.push({
          userId: intern.id,
          officeTaskId: task.id,
          date,
        });
        usedInternIds.add(intern.id);
        usedTaskIds.add(task.id);
      }
    } else {
      // Stajyer sayısı görevden az: her stajyer günde bir farklı iş yapar
      for (let internIndex = 0; internIndex < interns.length; internIndex++) {
        const intern = interns[internIndex]!;
        if (usedInternIds.has(intern.id)) continue;

        const startIdx = (internIndex + dayIndex) % tasks.length;
        const task = pickTask(tasks, usedTaskIds, startIdx);
        if (!task) continue;

        planned.push({
          userId: intern.id,
          officeTaskId: task.id,
          date,
        });
        usedInternIds.add(intern.id);
        usedTaskIds.add(task.id);
      }
    }
  }

  if (planned.length === 0) return;

  await prisma.officeTaskAssignment.createMany({
    data: planned,
    skipDuplicates: true,
  });
}

function pickIntern(
  interns: InternRef[],
  used: Set<string>,
  startIdx: number
): InternRef | null {
  for (let offset = 0; offset < interns.length; offset++) {
    const intern = interns[(startIdx + offset) % interns.length]!;
    if (!used.has(intern.id)) return intern;
  }
  return null;
}

function pickTask(
  tasks: TaskRef[],
  used: Set<string>,
  startIdx: number
): TaskRef | null {
  for (let offset = 0; offset < tasks.length; offset++) {
    const task = tasks[(startIdx + offset) % tasks.length]!;
    if (!used.has(task.id)) return task;
  }
  return null;
}
