import { getSession } from "@/lib/session";
import { getInternDirectoryData } from "@/lib/queries/intern-directory";
import { InternManager } from "@/components/intern-manager";

export default async function StajyerlerPage() {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const data = await getInternDirectoryData();

  return (
    <InternManager
      interns={data.interns}
      stats={data.stats}
      mentorName={data.mentorName}
      isAdmin={isAdmin}
    />
  );
}
