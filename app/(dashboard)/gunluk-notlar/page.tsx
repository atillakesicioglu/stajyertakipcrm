import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDailyNotesData } from "@/lib/queries/daily-notes";
import { DailyNotesBoard } from "@/components/daily-notes/daily-notes-board";

export default async function GunlukNotlarPage() {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const data = await getDailyNotesData({
    admin: isAdmin,
    userId: user.id,
  });

  return (
    <DailyNotesBoard
      reports={data.reports}
      interns={data.interns}
      todayReport={data.todayReport}
      stats={data.stats}
      isAdmin={isAdmin}
    />
  );
}
