"use client";

import { useSession } from "next-auth/react";
import { TaskBoard } from "@/components/task-board";
import { RefreshButton } from "@/components/refresh-button";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { TasksPageSkeleton } from "@/components/skeletons/board-skeletons";

export function GorevlerView() {
  const { data: session } = useSession();
  const { cache, loading, refresh } = useDashboardData();

  if (!session?.user) return null;

  const data = cache.tasks;
  if (!data) return <TasksPageSkeleton />;

  return (
    <TaskBoard
      tasks={data.tasks}
      role={session.user.role}
      interns={data.interns}
      statusLabels={data.statusLabels}
      statusBadges={data.statusBadges}
      variant="full"
      headerAction={
        <RefreshButton
          onClick={() => void refresh("tasks")}
          loading={loading.tasks}
        />
      }
    />
  );
}
