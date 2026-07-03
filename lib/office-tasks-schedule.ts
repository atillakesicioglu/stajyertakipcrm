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

type FillPassOptions = {
  allowMultiPerDay: boolean;
  allowWeekRepeat: boolean;
  allowPriorWeekRepeat: boolean;
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

function pickBestInternForTask(
  taskId: string,
  internOrder: InternRef[],
  usedTodayInterns: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>,
  priorWeekTasksByIntern: Map<string, Set<string>> | undefined,
  dayIndex: number,
  weekOffset: number,
  options: FillPassOptions
): InternRef | null {
  let best: { intern: InternRef; score: number } | null = null;

  for (let internIndex = 0; internIndex < internOrder.length; internIndex++) {
    const intern = internOrder[internIndex]!;
    if (!options.allowMultiPerDay && usedTodayInterns.has(intern.id)) continue;

    const weekTasks = weekTasksByIntern.get(intern.id) ?? new Set<string>();
    if (!options.allowWeekRepeat && weekTasks.has(taskId)) continue;
    if (internLastTask.get(intern.id) === taskId) continue;

    const priorWeek = priorWeekTasksByIntern?.get(intern.id);
    if (!options.allowPriorWeekRepeat && priorWeek?.has(taskId)) continue;

    let score = weekTasks.size * 100;
    score += internIndex;
    if (options.allowMultiPerDay && usedTodayInterns.has(intern.id)) {
      score += 500;
    }

    if (priorWeek?.has(taskId)) {
      score += 1000;
      score += (internSeed(intern.id) + weekOffset + dayIndex) % 17;
    } else {
      score -= 200;
    }

    if (options.allowWeekRepeat && weekTasks.has(taskId)) {
      score += 2000;
    }

    score += (internSeed(intern.id) + weekOffset + dayIndex) % 13;

    if (!best || score < best.score) {
      best = { intern, score };
    }
  }

  return best?.intern ?? null;
}

function fillEmptyTaskSlots(
  date: Date,
  dayIndex: number,
  tasks: TaskRef[],
  internOrder: InternRef[],
  usedTodayInterns: Set<string>,
  usedTodayTasks: Set<string>,
  weekTasksByIntern: Map<string, Set<string>>,
  internLastTask: Map<string, string>,
  priorWeekTasksByIntern: Map<string, Set<string>> | undefined,
  weekOffset: number,
  planned: PlannedCell[]
) {
  const fillInternOrder = [...internOrder].sort((a, b) => {
    const aWeek = weekTasksByIntern.get(a.id)?.size ?? 0;
    const bWeek = weekTasksByIntern.get(b.id)?.size ?? 0;
    if (aWeek !== bWeek) return aWeek - bWeek;
    return internSeed(a.id) - internSeed(b.id);
  });

  const fillPasses: FillPassOptions[] = [
    {
      allowMultiPerDay: false,
      allowWeekRepeat: false,
      allowPriorWeekRepeat: false,
    },
    {
      allowMultiPerDay: false,
      allowWeekRepeat: false,
      allowPriorWeekRepeat: true,
    },
    {
      allowMultiPerDay: true,
      allowWeekRepeat: false,
      allowPriorWeekRepeat: true,
    },
    {
      allowMultiPerDay: true,
      allowWeekRepeat: true,
      allowPriorWeekRepeat: true,
    },
  ];

  for (const pass of fillPasses) {
    for (const task of tasks) {
      if (usedTodayTasks.has(task.id)) continue;

      const intern = pickBestInternForTask(
        task.id,
        fillInternOrder,
        usedTodayInterns,
        weekTasksByIntern,
        internLastTask,
        priorWeekTasksByIntern,
        dayIndex,
        weekOffset,
        pass
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

    const internOrder = rotatedInterns(interns, dayIndex, weekOffset);
    const taskOrder = rotatedTasks(tasks, dayIndex, weekOffset);

    const mainPasses: FillPassOptions[] = [
      {
        allowMultiPerDay: false,
        allowWeekRepeat: false,
        allowPriorWeekRepeat: false,
      },
      {
        allowMultiPerDay: false,
        allowWeekRepeat: false,
        allowPriorWeekRepeat: true,
      },
    ];

    for (const pass of mainPasses) {
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
          pass
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

    fillEmptyTaskSlots(
      date,
      dayIndex,
      tasks,
      internOrder,
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
 * Kurallar:
 * - Aynı stajyer ardışık günlerde aynı görevi yapmaz
 * - Aynı hafta içinde aynı görev mümkün olduğunca tekrarlanmaz
 * - Önceki hafta yapılan görevler yeni haftada mümkün olduğunca tekrarlanmaz
 * - Boş kalan görev hücreleri otomatik doldurulur
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
