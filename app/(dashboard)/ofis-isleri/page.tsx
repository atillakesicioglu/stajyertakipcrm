import { getSession } from "@/lib/session";
import { getOrderedOfficeTasks } from "@/lib/office-tasks-defaults";
import { syncWeeklyOfficeAssignments } from "@/lib/office-tasks-schedule";
import { getInternList } from "@/lib/queries/interns";
import {
  getWorkWeekDates,
  formatWeekdayLabel,
  dateToKey,
  toDateOnly,
  isSameDateOnly,
} from "@/lib/date";
import { OfficeTasksBoard } from "@/components/office-tasks-board";

export default async function OfisIsleriPage() {
  const session = await getSession();
  const user = session!.user;
  const today = toDateOnly(new Date());
  const weekDates = getWorkWeekDates();

  const [tasks, interns] = await Promise.all([
    getOrderedOfficeTasks(),
    getInternList(),
  ]);

  const assignments = await syncWeeklyOfficeAssignments(
    weekDates,
    tasks,
    interns
  );

  const weekDays = weekDates.map((date) => ({
    dateKey: dateToKey(date),
    label: formatWeekdayLabel(date),
    isToday: isSameDateOnly(date, today),
  }));

  return (
    <OfficeTasksBoard
      weekDays={weekDays}
      tasks={tasks}
      interns={interns}
      assignments={assignments.map((a) => ({
        ...a,
        dateKey: dateToKey(a.date),
      }))}
      currentUserId={user.id}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
