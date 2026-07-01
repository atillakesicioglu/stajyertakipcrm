import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureTodayOfficeAssignments } from "@/lib/office-assignment";
import { toDateOnly, formatDateTR } from "@/lib/date";
import { OfficeTasksBoard } from "@/components/office-tasks-board";

export default async function OfisIsleriPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";
  const today = toDateOnly(new Date());
  const todayLabel = formatDateTR(today);

  await ensureTodayOfficeAssignments();

  if (isAdmin) {
    const [tasks, assignments, internCount] = await Promise.all([
      prisma.officeTask.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, description: true, active: true },
      }),
      prisma.officeTaskAssignment.findMany({
        where: { date: today },
        orderBy: [{ completed: "asc" }, { officeTask: { title: "asc" } }],
        include: {
          user: { select: { id: true, name: true } },
          officeTask: {
            select: { id: true, title: true, description: true },
          },
        },
      }),
      prisma.user.count({ where: { role: "INTERN" } }),
    ]);

    return (
      <OfficeTasksBoard
        role="ADMIN"
        todayLabel={todayLabel}
        tasks={tasks}
        assignments={assignments}
        internCount={internCount}
      />
    );
  }

  const assignments = await prisma.officeTaskAssignment.findMany({
    where: { userId: user.id, date: today },
    orderBy: { officeTask: { title: "asc" } },
    include: {
      user: { select: { id: true, name: true } },
      officeTask: { select: { id: true, title: true, description: true } },
    },
  });

  return (
    <OfficeTasksBoard
      role="INTERN"
      todayLabel={todayLabel}
      currentUserId={user.id}
      assignments={assignments}
    />
  );
}
