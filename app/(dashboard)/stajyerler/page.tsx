import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InternManager } from "@/components/intern-manager";

export default async function StajyerlerPage() {
  const session = await auth();
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
      _count: { select: { assignedTasks: true } },
    },
  });

  return <InternManager interns={interns} />;
}
