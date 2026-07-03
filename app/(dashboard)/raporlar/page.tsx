import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getReportsAnalytics } from "@/lib/queries/reports-analytics";
import { AdminAnalyticsDashboard } from "@/components/reports/admin-analytics-dashboard";
import { AdminReportView } from "@/components/report-manager";

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function RaporlarPage({ searchParams }: PageProps) {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";
  const params = await searchParams;

  if (!isAdmin) {
    redirect("/gunluk-notlar");
  }

  const [analytics, reports] = await Promise.all([
      getReportsAnalytics(params.from, params.to),
      prisma.dailyReport.findMany({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

  return (
    <Suspense>
      <AdminAnalyticsDashboard
        analytics={analytics}
        dailyNotesSlot={
          <AdminReportView reports={reports as never} embedded />
        }
      />
    </Suspense>
  );
}
