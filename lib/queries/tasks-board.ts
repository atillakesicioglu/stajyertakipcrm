import { prisma } from "@/lib/prisma";
import { getInternList } from "@/lib/queries/interns";
import { getTaskStatusDisplay } from "@/lib/queries/app-settings";
import type { TaskData } from "@/lib/types";

export const taskBoardInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  submissions: { orderBy: { submittedAt: "desc" as const }, take: 5 },
  revisions: { orderBy: { createdAt: "desc" as const }, take: 5 },
  starts: { orderBy: { startedAt: "desc" as const }, take: 5 },
};

const taskBoardIncludeLight = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  submissions: { orderBy: { submittedAt: "desc" as const }, take: 5 },
  revisions: { orderBy: { createdAt: "desc" as const }, take: 5 },
  starts: { orderBy: { startedAt: "desc" as const }, take: 5 },
};

export async function getTasksBoardData(options: {
  userId: string;
  isAdmin: boolean;
  /** Dashboard önizlemesi: daha az ilişki verisi */
  light?: boolean;
}) {
  const [tasks, interns, statusDisplay] = await Promise.all([
    prisma.task.findMany({
      where: options.isAdmin ? {} : { assignedToId: options.userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: options.light ? taskBoardIncludeLight : taskBoardInclude,
    }),
    options.isAdmin ? getInternList() : Promise.resolve([]),
    getTaskStatusDisplay(),
  ]);

  return {
    tasks: tasks as unknown as TaskData[],
    interns,
    statusLabels: statusDisplay.labels,
    statusBadges: statusDisplay.badges,
  };
}
