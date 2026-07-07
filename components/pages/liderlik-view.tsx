"use client";

import { useSession } from "next-auth/react";
import { LeaderboardBoard } from "@/components/gamification/leaderboard-board";
import { RefreshButton } from "@/components/refresh-button";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { LeaderboardPageSkeleton } from "@/components/skeletons/board-skeletons";

export function LiderlikView() {
  const { data: session } = useSession();
  const { cache, loading, refresh } = useDashboardData();

  if (!session?.user) return null;

  const data = cache.gamification;
  if (!data) return <LeaderboardPageSkeleton />;

  return (
    <LeaderboardBoard
      data={data}
      isAdmin={session.user.role === "ADMIN"}
      currentUserId={session.user.id}
      headerAction={
        <RefreshButton
          onClick={() => void refresh("gamification")}
          loading={loading.gamification}
        />
      }
    />
  );
}
