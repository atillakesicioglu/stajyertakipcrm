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
  const planned: PlannedCell[] = [];

  for (let dayIndex = 0; dayIndex < weekDates.length; dayIndex++) {
    const date = weekDates[dayIndex]!;
    const dayLocked = locked.filter((a) => isSameDateOnly(a.date, date));

    const usedInternIds = new Set(dayLocked.map((a) => a.userId));
    const usedTaskIds = new Set(dayLocked.map((a) => a.officeTaskId));

    if (interns.length >= tasks.length) {
      for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
        const task = tasks[taskIndex]!;
        if (usedTaskIds.has(task.id)) continue;

        const intern = pickIntern(
          interns,
          usedInternIds,
          (taskIndex + dayIndex) % interns.length
        );
        if (!intern) continue;

        planned.push({ userId: intern.id, officeTaskId: task.id, date });
        usedInternIds.add(intern.id);
        usedTaskIds.add(task.id);
      }
    } else {
      for (let internIndex = 0; internIndex < interns.length; internIndex++) {
        const intern = interns[internIndex]!;
        if (usedInternIds.has(intern.id)) continue;

        const task = pickTask(
          tasks,
          usedTaskIds,
          (internIndex + dayIndex) % tasks.length
        );
        if (!task) continue;

        planned.push({ userId: intern.id, officeTaskId: task.id, date });
        usedInternIds.add(intern.id);
        usedTaskIds.add(task.id);
      }
    }
  }

  return planned;
}

/**
 * Haftalık planı senkronize eder; değişiklik yoksa DB yazmaz.
 * Güncel atama listesini döndürür (tek findMany).
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

/** @deprecated syncWeeklyOfficeAssignments kullanın */
export const ensureWeeklyOfficeAssignments = syncWeeklyOfficeAssignments;
