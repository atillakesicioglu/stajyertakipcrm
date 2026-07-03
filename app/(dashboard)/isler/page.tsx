import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TaskBoard } from "@/components/task-board";
import { getInternList } from "@/lib/queries/interns";
import { getTaskStatusDisplay } from "@/lib/queries/app-settings";
import { getDailyNotesData } from "@/lib/queries/daily-notes";
import { getOfficeTasksBoardData } from "@/lib/queries/office-tasks-board-data";
import { DailyNotesBoard } from "@/components/daily-notes/daily-notes-board";
import { OfficeTasksBoard } from "@/components/office-tasks-board";
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
  const dailyNotesPromise = getDailyNotesData({
    admin: isAdmin,
    userId: user.id,
  });
  const officeTasksPromise = getOfficeTasksBoardData();

  const [tasks, interns, statusDisplay, dailyNotes, officeTasks] =
    await Promise.all([
      tasksPromise,
      internsPromise,
      getTaskStatusDisplay(),
      dailyNotesPromise,
      officeTasksPromise,
    ]);

  return (
    <div className="space-y-8">
      <TaskBoard
        tasks={tasks as unknown as TaskData[]}
        role={user.role}
        interns={interns}
        statusLabels={statusDisplay.labels}
        statusBadges={statusDisplay.badges}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <DailyNotesBoard
          reports={dailyNotes.reports}
          interns={dailyNotes.interns}
          todayReport={dailyNotes.todayReport}
          stats={dailyNotes.stats}
          isAdmin={isAdmin}
          variant="embed"
        />
        <OfficeTasksBoard
          weekDays={officeTasks.weekDays}
          weekRangeLabel={officeTasks.weekRangeLabel}
          nextWeekDays={officeTasks.nextWeekDays}
          nextWeekRangeLabel={officeTasks.nextWeekRangeLabel}
          tasks={officeTasks.tasks}
          interns={officeTasks.interns}
          assignments={officeTasks.assignments}
          nextAssignments={officeTasks.nextAssignments}
          currentUserId={user.id}
          isAdmin={isAdmin}
          variant="embed"
        />
      </div>
    </div>
  );
}
