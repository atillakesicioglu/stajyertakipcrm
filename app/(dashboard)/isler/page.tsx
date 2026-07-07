import { getSession } from "@/lib/session";
import { getDailyNotesData } from "@/lib/queries/daily-notes";
import { IslerView } from "@/components/pages/isler-view";

export default async function IslerPage() {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const dailyNotes = await getDailyNotesData({
    admin: isAdmin,
    userId: user.id,
    preview: true,
  });

  return <IslerView dailyNotes={dailyNotes} />;
}
