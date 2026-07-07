"use client";

import { useSession } from "next-auth/react";
import { TaskBoard } from "@/components/task-board";
import { DailyNotesBoard } from "@/components/daily-notes/daily-notes-board";
import { OfficeTasksBoard } from "@/components/office-tasks-board";
import { LeaderboardBoard } from "@/components/gamification/leaderboard-board";
import { RefreshButton } from "@/components/refresh-button";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { DashboardPageSkeleton } from "@/components/skeletons/board-skeletons";
import type { getDailyNotesData } from "@/lib/queries/daily-notes";

type DailyNotesData = Awaited<ReturnType<typeof getDailyNotesData>>;

import { useTaskMutationHandler } from "@/lib/hooks/use-task-mutation-handler";

export function IslerView({ dailyNotes }: { dailyNotes: DailyNotesData }) {
  const { data: session } = useSession();
  const { cache, loading, refresh } = useDashboardData();
  const handleTaskMutation = useTaskMutationHandler();

  if (!session?.user) return null;

  const taskData = cache.tasksLight;
  const officeData = cache.officePreview;
  const gamification = cache.gamification;

  if (!taskData || !officeData || !gamification) {
    return <DashboardPageSkeleton />;
  }

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex justify-end">
        <RefreshButton
          onClick={() => void refresh("all")}
          loading={loading.tasks || loading.office || loading.gamification}
        />
      </div>

      <TaskBoard
        tasks={taskData.tasks}
        role={session.user.role}
        interns={taskData.interns}
        statusLabels={taskData.statusLabels}
        statusBadges={taskData.statusBadges}
        variant="dashboard"
        onTaskMutation={handleTaskMutation}
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
          weekDays={officeData.weekDays}
          weekRangeLabel={officeData.weekRangeLabel}
          nextWeekDays={officeData.nextWeekDays}
          nextWeekRangeLabel={officeData.nextWeekRangeLabel}
          tasks={officeData.tasks}
          interns={officeData.interns}
          assignments={officeData.assignments}
          nextAssignments={officeData.nextAssignments}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
          variant="embed"
        />
      </div>

      <LeaderboardBoard
        data={gamification}
        isAdmin={isAdmin}
        currentUserId={session.user.id}
        variant="embed"
      />
    </div>
  );
}
