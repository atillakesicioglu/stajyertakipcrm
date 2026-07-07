import { prisma } from "@/lib/prisma";
import { getOrderedOfficeTasks } from "@/lib/office-tasks-defaults";
import {
  syncWeeklyOfficeAssignments,
  purgePastOfficeAssignments,
  fetchPriorWeekAssignments,
  buildTasksByIntern,
} from "@/lib/office-tasks-schedule";
import { getInternList, getOfficeEligibleInterns } from "@/lib/queries/interns";
import { getAppSettings } from "@/lib/queries/app-settings";
import {
  getWorkWeekDates,
  getNextWorkWeekDates,
  formatWeekdayLabel,
  formatWeekRangeLabel,
  SHORT_WEEKDAY_NAMES_TR,
  dateToKey,
  toDateOnly,
  isSameDateOnly,
} from "@/lib/date";

type OfficeTasksOptions = {
  /** false: dashboard önizlemesi — sadece okuma, senkron yok */
  sync?: boolean;
};

export async function getOfficeTasksBoardData(options?: OfficeTasksOptions) {
  const sync = options?.sync ?? true;
  const settings = await getAppSettings();
  const today = toDateOnly(new Date());
  const weekDates = getWorkWeekDates(new Date(), settings.weekStartDay);

  const weekDays = weekDates.map((date, i) => ({
    dateKey: dateToKey(date),
    label: formatWeekdayLabel(date),
    shortLabel: SHORT_WEEKDAY_NAMES_TR[i] ?? "",
    isToday: isSameDateOnly(date, today),
  }));

  if (!sync) {
    const [tasks, interns, eligibleInterns, initialRows] = await Promise.all([
      getOrderedOfficeTasks(),
      getInternList(),
      getOfficeEligibleInterns(),
      prisma.officeTaskAssignment.findMany({
        where: { date: { in: weekDates } },
        select: {
          id: true,
          userId: true,
          officeTaskId: true,
          date: true,
          completed: true,
          completedAt: true,
        },
      }),
    ]);

    let rows = initialRows;

    if (eligibleInterns.length > 0 && tasks.length > 0 && rows.length === 0) {
      const weekStart = weekDates[0]!;
      const priorWeekRows = await fetchPriorWeekAssignments(weekStart);
      const priorWeekTasks = buildTasksByIntern(priorWeekRows);
      await purgePastOfficeAssignments(weekDates);
      rows = await syncWeeklyOfficeAssignments(weekDates, tasks, eligibleInterns, {
        priorWeekTasksByIntern: priorWeekTasks,
      });
    }

    return {
      weekDays,
      weekRangeLabel: formatWeekRangeLabel(weekDates),
      nextWeekDays: [],
      nextWeekRangeLabel: "",
      tasks,
      interns,
      assignments: rows.map((a) => ({
        ...a,
        dateKey: dateToKey(a.date),
      })),
      nextAssignments: [],
    };
  }

  const nextWeekDates = getNextWorkWeekDates(new Date(), settings.weekStartDay);
  const weekStart = weekDates[0]!;

  const [tasks, interns, eligibleInterns, priorWeekRows] = await Promise.all([
    getOrderedOfficeTasks(),
    getInternList(),
    getOfficeEligibleInterns(),
    fetchPriorWeekAssignments(weekStart),
  ]);

  const priorWeekTasks = buildTasksByIntern(priorWeekRows);

  await purgePastOfficeAssignments(weekDates);

  const assignments = await syncWeeklyOfficeAssignments(
    weekDates,
    tasks,
    eligibleInterns,
    { priorWeekTasksByIntern: priorWeekTasks }
  );

  const currentWeekTasks = buildTasksByIntern(assignments);

  const lastDay = weekDates[weekDates.length - 1];
  const initialLastTask = new Map<string, string>();
  if (lastDay) {
    for (const a of assignments) {
      if (isSameDateOnly(a.date, lastDay)) {
        initialLastTask.set(a.userId, a.officeTaskId);
      }
    }
  }

  const nextAssignments = await syncWeeklyOfficeAssignments(
    nextWeekDates,
    tasks,
    eligibleInterns,
    {
      initialLastTask,
      priorWeekTasksByIntern: currentWeekTasks,
      weekOffset: weekDates.length,
    }
  );

  const nextWeekDays = nextWeekDates.map((date, i) => ({
    dateKey: dateToKey(date),
    label: formatWeekdayLabel(date),
    shortLabel: SHORT_WEEKDAY_NAMES_TR[i] ?? "",
    isToday: false,
  }));

  return {
    weekDays,
    weekRangeLabel: formatWeekRangeLabel(weekDates),
    nextWeekDays,
    nextWeekRangeLabel: formatWeekRangeLabel(nextWeekDates),
    tasks,
    interns,
    assignments: assignments.map((a) => ({
      ...a,
      dateKey: dateToKey(a.date),
    })),
    nextAssignments: nextAssignments.map((a) => ({
      ...a,
      dateKey: dateToKey(a.date),
    })),
  };
}
