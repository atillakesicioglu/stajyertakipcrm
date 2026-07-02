import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureTodayOfficeAssignments } from "@/lib/office-assignment";
import { getOrderedOfficeTasks } from "@/lib/office-tasks-defaults";
import { toDateOnly, formatDateTR } from "@/lib/date";
import { OfficeTasksBoard } from "@/components/office-tasks-board";

export default async function OfisIsleriPage() {
  const session = await getSession();
  const user = session!.user;
  const today = toDateOnly(new Date());
  const todayLabel = formatDateTR(today);

  await ensureTodayOfficeAssignments();

  const [tasks, interns, assignments] = await Promise.all([
    getOrderedOfficeTasks(),
    prisma.user.findMany({
      where: { role: "INTERN" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.officeTaskAssignment.findMany({
      where: { date: today },
      select: {
        id: true,
        userId: true,
        officeTaskId: true,
        completed: true,
        completedAt: true,
      },
    }),
  ]);

  return (
    <OfficeTasksBoard
      todayLabel={todayLabel}
      tasks={tasks}
      interns={interns}
      assignments={assignments}
      currentUserId={user.id}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
