import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureDefaultOfficeTasks, getOrderedOfficeTasks } from "@/lib/office-tasks-defaults";
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

  await ensureDefaultOfficeTasks();

  const [tasks, interns, assignments] = await Promise.all([
    getOrderedOfficeTasks(),
    prisma.user.findMany({
      where: { role: "INTERN" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
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
