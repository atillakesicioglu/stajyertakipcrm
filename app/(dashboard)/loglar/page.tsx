import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LogViewer } from "@/components/log-viewer";

export default async function LoglarPage() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") {
    redirect("/isler");
  }

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { name: true } } },
  });

  return <LogViewer logs={logs} />;
}
