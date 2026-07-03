import { getSession } from "@/lib/session";
import { getOrderedOfficeTasks } from "@/lib/office-tasks-defaults";
import {
  syncWeeklyOfficeAssignments,
  purgePastOfficeAssignments,
  fetchPriorWeekAssignments,
  buildTasksByIntern,
} from "@/lib/office-tasks-schedule";
import { getInternList } from "@/lib/queries/interns";
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
import { OfficeTasksBoard } from "@/components/office-tasks-board";

export default async function OfisIsleriPage() {
  const session = await getSession();
  const user = session!.user;
  const settings = await getAppSettings();
  const today = toDateOnly(new Date());
  const weekDates = getWorkWeekDates(new Date(), settings.weekStartDay);
  const nextWeekDates = getNextWorkWeekDates(new Date(), settings.weekStartDay);
  const weekStart = weekDates[0]!;

  const [tasks, interns, priorWeekRows] = await Promise.all([
    getOrderedOfficeTasks(),
    getInternList(),
    fetchPriorWeekAssignments(weekStart),
  ]);

  const priorWeekTasks = buildTasksByIntern(priorWeekRows);

  await purgePastOfficeAssignments(weekDates);

  const assignments = await syncWeeklyOfficeAssignments(
    weekDates,
    tasks,
    interns,
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
    interns,
    {
      initialLastTask,
      priorWeekTasksByIntern: currentWeekTasks,
      weekOffset: weekDates.length,
    }
  );

  const weekDays = weekDates.map((date, i) => ({
    dateKey: dateToKey(date),
    label: formatWeekdayLabel(date),
    shortLabel: SHORT_WEEKDAY_NAMES_TR[i] ?? "",
    isToday: isSameDateOnly(date, today),
  }));

  const nextWeekDays = nextWeekDates.map((date, i) => ({
    dateKey: dateToKey(date),
    label: formatWeekdayLabel(date),
    shortLabel: SHORT_WEEKDAY_NAMES_TR[i] ?? "",
    isToday: false,
  }));

  return (
    <OfficeTasksBoard
      weekDays={weekDays}
      weekRangeLabel={formatWeekRangeLabel(weekDates)}
      nextWeekDays={nextWeekDays}
      nextWeekRangeLabel={formatWeekRangeLabel(nextWeekDates)}
      tasks={tasks}
      interns={interns}
      assignments={assignments.map((a) => ({
        ...a,
        dateKey: dateToKey(a.date),
      }))}
      nextAssignments={nextAssignments.map((a) => ({
        ...a,
        dateKey: dateToKey(a.date),
      }))}
      currentUserId={user.id}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
