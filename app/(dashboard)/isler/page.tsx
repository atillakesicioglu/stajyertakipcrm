import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TaskBoard } from "@/components/task-board";
import type { TaskData, InternOption } from "@/lib/types";

const taskInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  submissions: { orderBy: { submittedAt: "desc" as const }, take: 5 },
  revisions: { orderBy: { createdAt: "desc" as const }, take: 5 },
  starts: { orderBy: { startedAt: "desc" as const }, take: 5 },
};

export default async function IslerPage() {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const tasksPromise = prisma.task.findMany({
    where: isAdmin ? {} : { assignedToId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: taskInclude,
  });

  const internsPromise: Promise<InternOption[]> = isAdmin
    ? prisma.user.findMany({
        where: { role: "INTERN" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : Promise.resolve([]);

  const [tasks, interns] = await Promise.all([tasksPromise, internsPromise]);

  return (
    <TaskBoard
      tasks={tasks as unknown as TaskData[]}
      role={user.role}
      interns={interns}
    />
  );
}
