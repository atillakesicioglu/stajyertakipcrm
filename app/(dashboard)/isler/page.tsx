import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TaskBoard } from "@/components/task-board";
import type { TaskData, InternOption } from "@/lib/types";

export default async function IslerPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const tasks = await prisma.task.findMany({
    where: isAdmin ? {} : { assignedToId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      assignedTo: { select: { id: true, name: true } },
      submissions: { orderBy: { submittedAt: "desc" } },
      revisions: { orderBy: { createdAt: "desc" } },
    },
  });

  const interns: InternOption[] = isAdmin
    ? await prisma.user.findMany({
        where: { role: "INTERN" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <TaskBoard
      tasks={tasks as unknown as TaskData[]}
      role={user.role}
      interns={interns}
    />
  );
}
