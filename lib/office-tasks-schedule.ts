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

function taskDayKey(officeTaskId: string, date: Date) {
  return `${dateToKey(date)}:${officeTaskId}`;
}

function internSeed(internId: string): number {
  let seed = 0;
  for (const ch of internId) seed += ch.charCodeAt(0);
  return seed;
}

function rotatedInterns(
  interns: InternRef[],
  dayIndex: number,
  weekOffset: number
): InternRef[] {
  const start = (dayIndex + weekOffset) % interns.length;
  return interns.map((_, i) => interns[(start + i) % interns.length]!);
}

function rotatedTasks(
  tasks: TaskRef[],
  dayIndex: number,
  weekOffset: number,
  seed = 0
): TaskRef[] {
  const start = (dayIndex + weekOffset + seed) % tasks.length;
  return tasks.map((_, i) => tasks[(start + i) % tasks.length]!);
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

function isHardBlocked(
  internId: string,
  taskId: string,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>
): boolean {
  const weekTasks = weekTasksByIntern.get(internId) ?? new Set<string>();
  if (weekTasks.has(taskId)) return true;
  if (internLastTask.get(internId) === taskId) return true;
  return false;
}

/** Stajyer için o gün en uygun görevi seçer (önce yeni görevler). */
function pickBestTaskForIntern(
  intern: InternRef,
  tasks: TaskRef[],
  usedTodayTasks: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>,
  priorWeek: Set<string> | undefined,
  dayIndex: number,
  internIndex: number,
  weekOffset: number,
  allowPriorWeekRepeat: boolean
): TaskRef | null {
  const weekTasks = weekTasksByIntern.get(intern.id) ?? new Set<string>();
  const lastTaskId = internLastTask.get(intern.id);
  const fresh: TaskRef[] = [];
  const fallback: TaskRef[] = [];

  for (const task of tasks) {
    if (usedTodayTasks.has(task.id)) continue;
    if (weekTasks.has(task.id)) continue;
    if (lastTaskId === task.id) continue;

    if (priorWeek?.has(task.id)) {
      if (allowPriorWeekRepeat) fallback.push(task);
      continue;
    }
    fresh.push(task);
  }

  const candidates = fresh.length > 0 ? fresh : fallback;
  if (candidates.length === 0) return null;

  const start =
    (dayIndex + internIndex + weekOffset + internSeed(intern.id)) %
    candidates.length;
  return candidates[start]!;
}

/** Görev satırı için en uygun stajyeri seçer (önceki hafta yapmamış olanı tercih). */
function pickBestInternForTask(
  taskId: string,
  internOrder: InternRef[],
  usedTodayInterns: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>,
  priorWeekTasksByIntern: Map<string, Set<string>> | undefined,
  dayIndex: number,
  weekOffset: number,
  allowPriorWeekRepeat: boolean,
  allowMultiPerDay: boolean
): InternRef | null {
  let best: { intern: InternRef; score: number } | null = null;

  for (let internIndex = 0; internIndex < internOrder.length; internIndex++) {
    const intern = internOrder[internIndex]!;
    if (!allowMultiPerDay && usedTodayInterns.has(intern.id)) continue;
    if (isHardBlocked(intern.id, taskId, weekTasksByIntern, internLastTask)) {
      continue;
    }

    const priorWeek = priorWeekTasksByIntern?.get(intern.id);
    if (!allowPriorWeekRepeat && priorWeek?.has(taskId)) continue;

    let score = (weekTasksByIntern.get(intern.id)?.size ?? 0) * 100;
    score += internIndex;

    if (allowMultiPerDay && usedTodayInterns.has(intern.id)) {
      score += 300;
    }

    if (priorWeek?.has(taskId)) {
      score += 10_000;
    } else {
      score -= 500;
    }

    score += (internSeed(intern.id) + weekOffset + dayIndex) % 13;

    if (!best || score < best.score) {
      best = { intern, score };
    }
  }

  return best?.intern ?? null;
}

function assignDay(
  date: Date,
  dayIndex: number,
  tasks: TaskRef[],
  interns: InternRef[],
  usedTodayInterns: Set<string>,
  usedTodayTasks: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>,
  priorWeekTasksByIntern: Map<string, Set<string>> | undefined,
  weekOffset: number,
  planned: PlannedCell[]
) {
  const internOrder = rotatedInterns(interns, dayIndex, weekOffset);
  const taskOrder = rotatedTasks(tasks, dayIndex, weekOffset);

  const passes = [
    { allowPriorWeekRepeat: false, allowMultiPerDay: false },
    { allowPriorWeekRepeat: true, allowMultiPerDay: false },
    { allowPriorWeekRepeat: true, allowMultiPerDay: true },
  ] as const;

  for (const pass of passes) {
    for (let internIndex = 0; internIndex < internOrder.length; internIndex++) {
      const intern = internOrder[internIndex]!;
      if (usedTodayInterns.has(intern.id)) continue;

      const priorWeek = priorWeekTasksByIntern?.get(intern.id);
      const task = pickBestTaskForIntern(
        intern,
        tasks,
        usedTodayTasks,
        weekTasksByIntern,
        internLastTask,
        priorWeek,
        dayIndex,
        internIndex,
        weekOffset,
        pass.allowPriorWeekRepeat
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

    for (const task of taskOrder) {
      if (usedTodayTasks.has(task.id)) continue;

      const intern = pickBestInternForTask(
        task.id,
        internOrder,
        usedTodayInterns,
        weekTasksByIntern,
        internLastTask,
        priorWeekTasksByIntern,
        dayIndex,
        weekOffset,
        pass.allowPriorWeekRepeat,
        pass.allowMultiPerDay
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

    assignDay(
      date,
      dayIndex,
      tasks,
      interns,
      usedTodayInterns,
      usedTodayTasks,
      weekTasksByIntern,
      internLastTask,
      priorWeekTasksByIntern,
      weekOffset,
      planned
    );
  }

  return planned;
}

function allTaskDaysCovered(
  planned: PlannedCell[],
  weekDates: Date[],
  tasks: TaskRef[]
): boolean {
  const covered = new Set(
    planned.map((p) => taskDayKey(p.officeTaskId, p.date))
  );

  for (const date of weekDates) {
    for (const task of tasks) {
      if (!covered.has(taskDayKey(task.id, date))) return false;
    }
  }

  return true;
}

/**
 * Haftalık planı senkronize eder; değişiklik yoksa DB yazmaz.
 * Kurallar (katı):
 * - Ardışık günlerde aynı görev asla tekrarlanmaz
 * - Aynı hafta içinde aynı görev asla tekrarlanmaz
 * - Önceki hafta yapılan görev mümkün olduğunca tekrarlanmaz
 * - Boş hücreler en son aşamada doldurulur
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

  const existingTaskDays = new Set(
    existing.map((a) => taskDayKey(a.officeTaskId, a.date))
  );
  const plannedTaskDays = new Set(
    planned.map((p) => taskDayKey(p.officeTaskId, p.date))
  );

  const scheduleUnchanged =
    incompleteKeys.size === plannedKeys.size &&
    [...plannedKeys].every((key) => incompleteKeys.has(key)) &&
    [...plannedTaskDays].every((key) => existingTaskDays.has(key)) &&
    allTaskDaysCovered(existing, weekDates, tasks);

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
