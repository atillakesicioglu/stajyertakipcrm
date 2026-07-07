import { getSession } from "@/lib/session";
import { getGamificationData } from "@/lib/queries/gamification";
import { LeaderboardBoard } from "@/components/gamification/leaderboard-board";
import { notifyNewBadges } from "@/lib/actions/gamification";

export default async function LiderlikPage() {
  const session = await getSession();
  const user = session!.user;

  const data = await getGamificationData({ userId: user.id });

  if (data.currentUserScore?.newlyEarnedBadgeKeys.length) {
    await notifyNewBadges(
      user.id,
      data.currentUserScore.newlyEarnedBadgeKeys
    );
  }

  return (
    <LeaderboardBoard
      data={data}
      isAdmin={user.role === "ADMIN"}
      currentUserId={user.id}
    />
  );
}
