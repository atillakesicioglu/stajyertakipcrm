import { prisma } from "@/lib/prisma";
import { dateToKey, isSameDateOnly } from "@/lib/date";

type TaskRef = { id: string };
type InternRef = { id: string };

type PlannedCell = {
  userId: string;
  officeTaskId: string;
  date: Date;
};

export type OfficeAssignmentRow = {
  id: string;
  userId: string;
  officeTaskId: string;
  date: Date;
  completed: boolean;
  completedAt: Date | null;
};

function cellKey(userId: string, officeTaskId: string, date: Date) {
  return `${dateToKey(date)}:${officeTaskId}:${userId}`;
}

function buildPlanned(
  weekDates: Date[],
  tasks: TaskRef[],
  interns: InternRef[],
  locked: { userId: string; officeTaskId: string; date: Date }[]
): PlannedCell[] {
  /** Stajyerin bu hafta yaptığı / yapacağı görevler — aynı görev tekrarlanmaz */
  const weekTasksByIntern = new Map<string, Set<string>>();

  for (const lock of locked) {
    const set = weekTasksByIntern.get(lock.userId) ?? new Set<string>();
    set.add(lock.officeTaskId);
    weekTasksByIntern.set(lock.userId, set);
  }

  const planned: PlannedCell[] = [];

  for (let dayIndex = 0; dayIndex < weekDates.length; dayIndex++) {
    const date = weekDates[dayIndex]!;
    const dayLocked = locked.filter((a) => isSameDateOnly(a.date, date));
    const usedInternIds = new Set(dayLocked.map((a) => a.userId));
    const usedTaskIds = new Set(dayLocked.map((a) => a.officeTaskId));

    const taskOrder = tasks.map((_, i) => tasks[(i + dayIndex) % tasks.length]!);

    for (let taskOrderIndex = 0; taskOrderIndex < taskOrder.length; taskOrderIndex++) {
      const task = taskOrder[taskOrderIndex]!;
      if (usedTaskIds.has(task.id)) continue;

      const intern = pickInternForTask(
        interns,
        task.id,
        usedInternIds,
        weekTasksByIntern,
        dayIndex + taskOrderIndex
      );
      if (!intern) continue;

      planned.push({ userId: intern.id, officeTaskId: task.id, date });
      usedInternIds.add(intern.id);
      usedTaskIds.add(task.id);

      const weekSet = weekTasksByIntern.get(intern.id) ?? new Set<string>();
      weekSet.add(task.id);
      weekTasksByIntern.set(intern.id, weekSet);
    }
  }

  return planned;
}

/**
 * Haftalık planı senkronize eder; değişiklik yoksa DB yazmaz.
 * Kural: stajyer aynı haftada aynı görevi tekrar yapmaz; aynı gün görevler farklı kişilere gider.
 */
export async function syncWeeklyOfficeAssignments(
  weekDates: Date[],
  tasks: TaskRef[],
  interns: InternRef[]
): Promise<OfficeAssignmentRow[]> {
  if (interns.length === 0 || tasks.length === 0 || weekDates.length === 0) {
    return [];
  }

  const existing = await prisma.officeTaskAssignment.findMany({
    where: { date: { in: weekDates } },
    select: {
      id: true,
      officeTaskId: true,
      date: true,
      userId: true,
      completed: true,
      completedAt: true,
    },
  });

  const locked = existing.filter((a) => a.completed);
  const planned = buildPlanned(weekDates, tasks, interns, locked);

  const incompleteKeys = new Set(
    existing
      .filter((a) => !a.completed)
      .map((a) => cellKey(a.userId, a.officeTaskId, a.date))
  );
  const plannedKeys = new Set(
    planned.map((p) => cellKey(p.userId, p.officeTaskId, p.date))
  );

  const scheduleUnchanged =
    incompleteKeys.size === plannedKeys.size &&
    [...plannedKeys].every((key) => incompleteKeys.has(key));

  if (scheduleUnchanged) {
    return existing;
  }

  await prisma.officeTaskAssignment.deleteMany({
    where: {
      date: { in: weekDates },
      completed: false,
    },
  });

  if (planned.length === 0) {
    return existing.filter((a) => a.completed);
  }

  await prisma.officeTaskAssignment.createMany({
    data: planned,
    skipDuplicates: true,
  });

  const created = await prisma.officeTaskAssignment.findMany({
    where: {
      date: { in: weekDates },
      completed: false,
    },
    select: {
      id: true,
      officeTaskId: true,
      date: true,
      userId: true,
      completed: true,
      completedAt: true,
    },
  });

  return [...existing.filter((a) => a.completed), ...created];
}

/** Hafta içinde bu görevi yapmamış, bugün başka işi olmayan stajyer seçer */
function pickInternForTask(
  interns: InternRef[],
  taskId: string,
  usedToday: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  rotateSeed: number
): InternRef | null {
  const start = rotateSeed % interns.length;
  for (let offset = 0; offset < interns.length; offset++) {
    const intern = interns[(start + offset) % interns.length]!;
    if (usedToday.has(intern.id)) continue;
    if (weekTasksByIntern.get(intern.id)?.has(taskId)) continue;
    return intern;
  }
  return null;
}

/** @deprecated syncWeeklyOfficeAssignments kullanın */
export const ensureWeeklyOfficeAssignments = syncWeeklyOfficeAssignments;
