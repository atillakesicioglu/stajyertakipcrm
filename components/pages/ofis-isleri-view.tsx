"use client";

import { useSession } from "next-auth/react";
import { OfficeTasksBoard } from "@/components/office-tasks-board";
import { RefreshButton } from "@/components/refresh-button";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { OfficeTasksPageSkeleton } from "@/components/skeletons/board-skeletons";

export function OfisIsleriView() {
  const { data: session } = useSession();
  const { cache, loading, refresh } = useDashboardData();

  if (!session?.user) return null;

  const data = cache.office;
  if (!data) return <OfficeTasksPageSkeleton />;

  return (
    <OfficeTasksBoard
      weekDays={data.weekDays}
      weekRangeLabel={data.weekRangeLabel}
      nextWeekDays={data.nextWeekDays}
      nextWeekRangeLabel={data.nextWeekRangeLabel}
      tasks={data.tasks}
      interns={data.interns}
      assignments={data.assignments}
      nextAssignments={data.nextAssignments}
      currentUserId={session.user.id}
      isAdmin={session.user.role === "ADMIN"}
      headerAction={
        <RefreshButton
          onClick={() => void refresh("office")}
          loading={loading.office}
        />
      }
    />
  );
}
