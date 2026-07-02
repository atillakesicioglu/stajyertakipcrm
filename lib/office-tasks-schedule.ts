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
  locked: { userId: string; officeTaskId: string; date: Date }[],
  options?: {
    initialLastTask?: Map<string, string>;
    priorWeekTasksByIntern?: Map<string, Set<string>>;
    /** Görev sırasını kaydırır (gelecek hafta için 5). */
    weekOffset?: number;
  }
): PlannedCell[] {
  const weekTasksByIntern = new Map<string, Set<string>>();
  const internLastTask = new Map<string, string>(options?.initialLastTask);
  const priorWeekTasksByIntern = options?.priorWeekTasksByIntern;
  const weekOffset = options?.weekOffset ?? 0;

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

    const dayPlanned: PlannedCell[] = [];

    const restInternId =
      interns.length > tasks.length
        ? interns[(dayIndex + weekOffset) % interns.length]!.id
        : null;

    const taskOrder = tasks.map(
      (_, i) => tasks[(i + dayIndex + weekOffset) % tasks.length]!
    );

    for (let taskOrderIndex = 0; taskOrderIndex < taskOrder.length; taskOrderIndex++) {
      const task = taskOrder[taskOrderIndex]!;
      if (usedTaskIds.has(task.id)) continue;

      const rotateSeed = dayIndex + taskOrderIndex + weekOffset;

      const intern =
        pickInternForTask(
          interns,
          task.id,
          usedInternIds,
          weekTasksByIntern,
          internLastTask,
          priorWeekTasksByIntern,
          restInternId,
          rotateSeed,
          true,
          true
        ) ??
        pickInternForTask(
          interns,
          task.id,
          usedInternIds,
          weekTasksByIntern,
          internLastTask,
          priorWeekTasksByIntern,
          null,
          rotateSeed,
          true,
          true
        ) ??
        pickInternForTask(
          interns,
          task.id,
          usedInternIds,
          weekTasksByIntern,
          internLastTask,
          priorWeekTasksByIntern,
          null,
          rotateSeed,
          true,
          false
        );

      if (!intern) continue;

      const cell = { userId: intern.id, officeTaskId: task.id, date };
      dayPlanned.push(cell);
      planned.push(cell);
      usedInternIds.add(intern.id);
      usedTaskIds.add(task.id);

      const weekSet = weekTasksByIntern.get(intern.id) ?? new Set<string>();
      weekSet.add(task.id);
      weekTasksByIntern.set(intern.id, weekSet);
    }

    for (const lock of dayLocked) {
      internLastTask.set(lock.userId, lock.officeTaskId);
    }
    for (const cell of dayPlanned) {
      internLastTask.set(cell.userId, cell.officeTaskId);
    }
  }

  return planned;
}

/**
 * Haftalık planı senkronize eder; değişiklik yoksa DB yazmaz.
 * Kurallar: aynı hafta aynı görev tekrar yok, ardışık günlerde farklı görev,
 * önceki hafta yapılan görevler mümkünse tekrarlanmaz, aynı günde her göreve tek stajyer.
 */
export async function syncWeeklyOfficeAssignments(
  weekDates: Date[],
  tasks: TaskRef[],
  interns: InternRef[],
  options?: {
    initialLastTask?: Map<string, string>;
    priorWeekTasksByIntern?: Map<string, Set<string>>;
    weekOffset?: number;
  }
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
  const planned = buildPlanned(weekDates, tasks, interns, locked, options);

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

function pickInternForTask(
  interns: InternRef[],
  taskId: string,
  usedToday: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>,
  priorWeekTasksByIntern: Map<string, Set<string>> | undefined,
  skipInternId: string | null,
  rotateSeed: number,
  enforceYesterday: boolean,
  enforcePriorWeek: boolean
): InternRef | null {
  const start = rotateSeed % interns.length;

  for (let offset = 0; offset < interns.length; offset++) {
    const intern = interns[(start + offset) % interns.length]!;
    if (usedToday.has(intern.id)) continue;
    if (skipInternId && intern.id === skipInternId) continue;
    if (weekTasksByIntern.get(intern.id)?.has(taskId)) continue;
    if (
      enforcePriorWeek &&
      priorWeekTasksByIntern?.get(intern.id)?.has(taskId)
    ) {
      continue;
    }
    if (
      enforceYesterday &&
      internLastTask.get(intern.id) === taskId
    ) {
      continue;
    }
    return intern;
  }

  return null;
}

export function buildTasksByIntern(
  assignments: { userId: string; officeTaskId: string }[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const a of assignments) {
    const set = map.get(a.userId) ?? new Set<string>();
    set.add(a.officeTaskId);
    map.set(a.userId, set);
  }
  return map;
}

/** Yeni hafta başlamadan önce silinecek geçmiş atamaları okur. */
export async function fetchPriorWeekAssignments(weekStart: Date) {
  return prisma.officeTaskAssignment.findMany({
    where: { date: { lt: weekStart } },
    select: { userId: true, officeTaskId: true },
  });
}

/** Geçmiş haftaların atamalarını siler (yeni hafta başlayınca). */
export async function purgePastOfficeAssignments(
  currentWeekDates: Date[]
): Promise<void> {
  const weekStart = currentWeekDates[0];
  if (!weekStart) return;

  await prisma.officeTaskAssignment.deleteMany({
    where: { date: { lt: weekStart } },
  });
}

/** @deprecated syncWeeklyOfficeAssignments kullanın */
export const ensureWeeklyOfficeAssignments = syncWeeklyOfficeAssignments;
