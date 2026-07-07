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

/**
 * Döngüsel ofis işi ataması.
 *
 * d = gün indeksi (hafta başı 0, sonraki haftalar weekOffset ile devam eder)
 * n = aktif stajyer sayısı, m = görev sayısı
 *
 * m >= n: her stajyer bir görev alır, kalan görevler sırayla stajyerlere döner
 * m < n: her görev dolu kalır, fazla stajyerler sırayla dinlenir
 */
export function computeDayTaskToIntern(
  dayOffset: number,
  internCount: number,
  taskCount: number
): number[] {
  const n = internCount;
  const m = taskCount;
  const d = dayOffset;
  const assignment = new Array<number>(m);

  if (n === 0 || m === 0) return assignment;

  if (m >= n) {
    const covered = new Set<number>();
    for (let i = 0; i < n; i++) {
      const taskIndex = (i + d) % m;
      assignment[taskIndex] = i;
      covered.add(taskIndex);
    }
    let surplusIndex = 0;
    for (let taskIndex = 0; taskIndex < m; taskIndex++) {
      if (!covered.has(taskIndex)) {
        assignment[taskIndex] = (d + surplusIndex) % n;
        surplusIndex++;
      }
    }
  } else {
    for (let taskIndex = 0; taskIndex < m; taskIndex++) {
      assignment[taskIndex] = (taskIndex + d) % n;
    }
  }

  return assignment;
}

function buildPlanned(
  weekDates: Date[],
  tasks: TaskRef[],
  interns: InternRef[],
  locked: { userId: string; officeTaskId: string; date: Date }[],
  options?: {
    weekOffset?: number;
  }
): PlannedCell[] {
  const weekOffset = options?.weekOffset ?? 0;
  const planned: PlannedCell[] = [];

  for (let dayIndex = 0; dayIndex < weekDates.length; dayIndex++) {
    const date = weekDates[dayIndex]!;
    const dayOffset = dayIndex + weekOffset;
    const dayLocked = locked.filter((a) => isSameDateOnly(a.date, date));
    const lockedByTaskId = new Map(
      dayLocked.map((a) => [a.officeTaskId, a.userId])
    );

    const internByTaskIndex = computeDayTaskToIntern(
      dayOffset,
      interns.length,
      tasks.length
    );

    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
      const task = tasks[taskIndex]!;
      const lockedUserId = lockedByTaskId.get(task.id);
      const userId =
        lockedUserId ?? interns[internByTaskIndex[taskIndex]!]?.id ?? null;
      if (!userId) continue;

      planned.push({
        userId,
        officeTaskId: task.id,
        date,
      });
    }
  }

  return planned;
}

function allTaskDaysCovered(
  assignments: { officeTaskId: string; date: Date }[],
  weekDates: Date[],
  tasks: TaskRef[]
): boolean {
  const covered = new Set(
    assignments.map((a) => taskDayKey(a.officeTaskId, a.date))
  );

  for (const date of weekDates) {
    for (const task of tasks) {
      if (!covered.has(taskDayKey(task.id, date))) return false;
    }
  }

  return true;
}

/**
 * Haftalık planı döngüsel algoritmayla senkronize eder.
 * Her gün tüm görevler dolu; tamamlanan hücreler kilitli kalır.
 */
export async function syncWeeklyOfficeAssignments(
  weekDates: Date[],
  tasks: TaskRef[],
  interns: InternRef[],
  options?: {
    weekOffset?: number;
    /** @deprecated Döngüsel algoritma kullanmıyor */
    initialLastTask?: Map<string, string>;
    /** @deprecated Döngüsel algoritma kullanmıyor */
    priorWeekTasksByIntern?: Map<string, Set<string>>;
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
