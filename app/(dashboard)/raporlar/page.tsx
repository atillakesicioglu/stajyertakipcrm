import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getReportsAnalytics } from "@/lib/queries/reports-analytics";
import { AdminAnalyticsDashboard } from "@/components/reports/admin-analytics-dashboard";
import { AdminReportView } from "@/components/report-manager";
import { InternReportView } from "@/components/report-manager";

function toDateOnly(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function RaporlarPage({ searchParams }: PageProps) {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";
  const params = await searchParams;

  if (isAdmin) {
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

  const todayUTC = toDateOnly(new Date());

  const [todayReport, pastReports] = await Promise.all([
    prisma.dailyReport.findUnique({
      where: { userId_date: { userId: user.id, date: todayUTC } },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.dailyReport.findMany({
      where: {
        userId: user.id,
        date: { lt: todayUTC },
      },
      orderBy: { date: "desc" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <InternReportView
      todayReport={todayReport as never}
      pastReports={pastReports as never}
    />
  );
}
