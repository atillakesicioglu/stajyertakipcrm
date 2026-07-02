import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { InternManager } from "@/components/intern-manager";
import { isUnsetPasswordSync } from "@/lib/password";

export default async function StajyerlerPage() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") {
    redirect("/isler");
  }

  const interns = await prisma.user.findMany({
    where: { role: "INTERN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      lastLoginAt: true,
      createdAt: true,
      passwordHash: true,
      _count: { select: { assignedTasks: true } },
    },
  });

  const internsWithStatus = interns.map(({ passwordHash, ...intern }) => ({
    ...intern,
    needsPasswordSetup: isUnsetPasswordSync(passwordHash),
  }));

  return <InternManager interns={internsWithStatus} />;
}
