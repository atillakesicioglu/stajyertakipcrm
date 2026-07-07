import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInternDirectoryData, getWeeklyProgressForInterns } from "@/lib/queries/intern-directory";
import { getGamificationData } from "@/lib/queries/gamification";
import { InternManager } from "@/components/intern-manager";

export default async function StajyerlerPage() {
  const session = await getSession();
  const user = session!.user;

  if (user.role !== "ADMIN") {
    redirect("/isler");
  }

  const isAdmin = true;

  const data = await getInternDirectoryData();
  const internIds = data.interns.map((i) => i.id);

  const [gamification, weeklyProgressByIntern] = await Promise.all([
    getGamificationData({ syncBadges: true }),
    getWeeklyProgressForInterns(internIds),
  ]);

  const gamificationByIntern = Object.fromEntries(
    gamification.leaderboard.map((entry) => [entry.internId, entry])
  );

  return (
    <InternManager
      interns={data.interns}
      stats={data.stats}
      mentorName={data.mentorName}
      isAdmin={isAdmin}
      gamificationByIntern={gamificationByIntern}
      weeklyProgressByIntern={weeklyProgressByIntern}
    />
  );
}
