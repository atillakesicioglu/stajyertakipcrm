import { getSession } from "@/lib/session";
import { TaskBoard } from "@/components/task-board";
import { getTasksBoardData } from "@/lib/queries/tasks-board";
import { getDailyNotesData } from "@/lib/queries/daily-notes";
import { getOfficeTasksBoardData } from "@/lib/queries/office-tasks-board-data";
import { DailyNotesBoard } from "@/components/daily-notes/daily-notes-board";
import { OfficeTasksBoard } from "@/components/office-tasks-board";

export default async function IslerPage() {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const tasksPromise = getTasksBoardData({
    userId: user.id,
    isAdmin,
    light: true,
  });
  const dailyNotesPromise = getDailyNotesData({
    admin: isAdmin,
    userId: user.id,
    preview: true,
  });
  const officeTasksPromise = getOfficeTasksBoardData({ sync: false });

  const [taskData, dailyNotes, officeTasks] = await Promise.all([
    tasksPromise,
    dailyNotesPromise,
    officeTasksPromise,
  ]);

  return (
    <div className="space-y-8">
      <TaskBoard
        tasks={taskData.tasks}
        role={user.role}
        interns={taskData.interns}
        statusLabels={taskData.statusLabels}
        statusBadges={taskData.statusBadges}
        variant="dashboard"
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
