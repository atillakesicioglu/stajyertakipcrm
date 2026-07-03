import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TaskBoard } from "@/components/task-board";
import { getInternList } from "@/lib/queries/interns";
import { getTaskStatusDisplay } from "@/lib/queries/app-settings";
import type { TaskData } from "@/lib/types";

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

  const internsPromise = isAdmin ? getInternList() : Promise.resolve([]);

  const [tasks, interns, statusDisplay] = await Promise.all([
    tasksPromise,
    internsPromise,
    getTaskStatusDisplay(),
  ]);

  return (
    <TaskBoard
      tasks={tasks as unknown as TaskData[]}
      role={user.role}
      interns={interns}
      statusLabels={statusDisplay.labels}
      statusBadges={statusDisplay.badges}
    />
  );
}
