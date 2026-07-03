import { getSession } from "@/lib/session";
import { getOfficeTasksBoardData } from "@/lib/queries/office-tasks-board-data";
import { OfficeTasksBoard } from "@/components/office-tasks-board";

export default async function OfisIsleriPage() {
  const session = await getSession();
  const user = session!.user;
  const officeTasks = await getOfficeTasksBoardData();

  return (
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
      isAdmin={user.role === "ADMIN"}
    />
  );
}
