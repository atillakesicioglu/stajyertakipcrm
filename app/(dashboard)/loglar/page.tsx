import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogViewer } from "@/components/log-viewer";

export default async function LoglarPage() {
  const session = await auth();
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
