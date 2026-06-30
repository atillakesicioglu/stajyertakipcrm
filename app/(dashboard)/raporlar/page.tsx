import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminReportView } from "@/components/report-manager";
import { InternReportView } from "@/components/report-manager";

/** UTC gece yarısına normalize eder */
function toDateOnly(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

export default async function RaporlarPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  if (isAdmin) {
    /* ── Admin: tüm raporları çek ── */
    const reports = await prisma.dailyReport.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { user: { select: { id: true, name: true } } },
    });

    return <AdminReportView reports={reports as any} />;
  }

  /* ── Stajyer: bugünkü + geçmiş raporlar ── */
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
      todayReport={todayReport as any}
      pastReports={pastReports as any}
    />
  );
}
