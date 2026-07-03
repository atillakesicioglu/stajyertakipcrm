import { getSession } from "@/lib/session";
import { TaskBoard } from "@/components/task-board";
import { getTasksBoardData } from "@/lib/queries/tasks-board";

export default async function GorevlerPage() {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const { tasks, interns, statusLabels, statusBadges } =
    await getTasksBoardData({
      userId: user.id,
      isAdmin,
    });

  return (
    <TaskBoard
      tasks={tasks}
      role={user.role}
      interns={interns}
      statusLabels={statusLabels}
      statusBadges={statusBadges}
      variant="full"
    />
  );
}
