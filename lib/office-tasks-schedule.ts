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

function rotatedInterns(
  interns: InternRef[],
  dayIndex: number,
  weekOffset: number
): InternRef[] {
  const start = (dayIndex + weekOffset) % interns.length;
  return interns.map((_, i) => interns[(start + i) % interns.length]!);
}

function pickTaskForIntern(
  internId: string,
  tasks: TaskRef[],
  usedTodayTasks: Set<string>,
  weekTasks: Set<string>,
  lastTaskId: string | undefined,
  priorWeekTasks: Set<string> | undefined,
  dayIndex: number,
  internIndex: number,
  weekOffset: number,
  allowPriorWeekRepeat: boolean,
  allowWeekRepeat: boolean
): TaskRef | null {
  const candidates: TaskRef[] = [];

  for (const task of tasks) {
    if (usedTodayTasks.has(task.id)) continue;
    if (!allowWeekRepeat && weekTasks.has(task.id)) continue;
    if (lastTaskId === task.id) continue;
    if (
      !allowPriorWeekRepeat &&
      priorWeekTasks?.has(task.id)
    ) {
      continue;
    }
    candidates.push(task);
  }

  if (candidates.length === 0) return null;

  const start = (dayIndex + internIndex + weekOffset) % candidates.length;
  return candidates[start]!;
}

function pickInternForTask(
  taskId: string,
  interns: InternRef[],
  usedTodayInterns: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>,
  priorWeekTasksByIntern: Map<string, Set<string>> | undefined,
  skipInternId: string | null,
  dayIndex: number,
  weekOffset: number,
  allowPriorWeekRepeat: boolean,
  allowWeekRepeat: boolean
): InternRef | null {
  const start = (dayIndex + weekOffset) % interns.length;

  for (let offset = 0; offset < interns.length; offset++) {
    const intern = interns[(start + offset) % interns.length]!;
    if (usedTodayInterns.has(intern.id)) continue;
    if (skipInternId && intern.id === skipInternId) continue;

    const weekTasks = weekTasksByIntern.get(intern.id) ?? new Set<string>();
    if (!allowWeekRepeat && weekTasks.has(taskId)) continue;
    if (internLastTask.get(intern.id) === taskId) continue;
    if (
      !allowPriorWeekRepeat &&
      priorWeekTasksByIntern?.get(intern.id)?.has(taskId)
    ) {
      continue;
    }

    return intern;
  }

  return null;
}

function assignCell(
  cell: PlannedCell,
  planned: PlannedCell[],
  usedTodayInterns: Set<string>,
  usedTodayTasks: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>
) {
  planned.push(cell);
  usedTodayInterns.add(cell.userId);
  usedTodayTasks.add(cell.officeTaskId);

  const weekSet = weekTasksByIntern.get(cell.userId) ?? new Set<string>();
  weekSet.add(cell.officeTaskId);
  weekTasksByIntern.set(cell.userId, weekSet);
  internLastTask.set(cell.userId, cell.officeTaskId);
}

function buildPlanned(
  weekDates: Date[],
  tasks: TaskRef[],
  interns: InternRef[],
  locked: { userId: string; officeTaskId: string; date: Date }[],
  options?: {
    initialLastTask?: Map<string, string>;
    priorWeekTasksByIntern?: Map<string, Set<string>>;
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
    const usedTodayInterns = new Set(dayLocked.map((a) => a.userId));
    const usedTodayTasks = new Set(dayLocked.map((a) => a.officeTaskId));

    for (const lock of dayLocked) {
      internLastTask.set(lock.userId, lock.officeTaskId);
    }

    const restInternId =
      interns.length > tasks.length
        ? interns[(dayIndex + weekOffset) % interns.length]!.id
        : null;

    const internOrder = rotatedInterns(interns, dayIndex, weekOffset);

    const relaxationPasses = [
      { allowPriorWeekRepeat: false, allowWeekRepeat: false },
      { allowPriorWeekRepeat: true, allowWeekRepeat: false },
      { allowPriorWeekRepeat: true, allowWeekRepeat: true },
    ] as const;

    for (const pass of relaxationPasses) {
      for (let internIndex = 0; internIndex < internOrder.length; internIndex++) {
        const intern = internOrder[internIndex]!;
        if (usedTodayInterns.has(intern.id)) continue;
        if (restInternId && intern.id === restInternId) continue;

        const weekTasks = weekTasksByIntern.get(intern.id) ?? new Set<string>();
        const task = pickTaskForIntern(
          intern.id,
          tasks,
          usedTodayTasks,
          weekTasks,
          internLastTask.get(intern.id),
          priorWeekTasksByIntern?.get(intern.id),
          dayIndex,
          internIndex,
          weekOffset,
          pass.allowPriorWeekRepeat,
          pass.allowWeekRepeat
        );

        if (!task) continue;

        assignCell(
          { userId: intern.id, officeTaskId: task.id, date },
          planned,
          usedTodayInterns,
          usedTodayTasks,
          weekTasksByIntern,
          internLastTask
        );
      }

      const taskOrder = tasks.map(
        (_, i) => tasks[(i + dayIndex + weekOffset) % tasks.length]!
      );

      for (const task of taskOrder) {
        if (usedTodayTasks.has(task.id)) continue;

        const intern = pickInternForTask(
          task.id,
          internOrder,
          usedTodayInterns,
          weekTasksByIntern,
          internLastTask,
          priorWeekTasksByIntern,
          restInternId,
          dayIndex,
          weekOffset,
          pass.allowPriorWeekRepeat,
          pass.allowWeekRepeat
        );

        if (!intern) continue;

        assignCell(
          { userId: intern.id, officeTaskId: task.id, date },
          planned,
          usedTodayInterns,
          usedTodayTasks,
          weekTasksByIntern,
          internLastTask
        );
      }

      if (usedTodayTasks.size === tasks.length) break;
    }
  }

  return planned;
}

/**
 * Haftalık planı senkronize eder; değişiklik yoksa DB yazmaz.
 * Kurallar:
 * - Aynı stajyer ardışık günlerde aynı görevi yapmaz
 * - Aynı hafta içinde aynı görev mümkün olduğunca tekrarlanmaz
 * - Önceki hafta yapılan görevler yeni haftada mümkün olduğunca tekrarlanmaz
 * - Aynı günde her göreve en fazla bir stajyer atanır
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
