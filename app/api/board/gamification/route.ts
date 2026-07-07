import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getGamificationData } from "@/lib/queries/gamification";
import { notifyNewBadges } from "@/lib/actions/gamification";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getGamificationData({ userId: session.user.id });

  if (data.currentUserScore?.newlyEarnedBadgeKeys.length) {
    await notifyNewBadges(
      session.user.id,
      data.currentUserScore.newlyEarnedBadgeKeys
    );
  }

  return NextResponse.json(data);
}
