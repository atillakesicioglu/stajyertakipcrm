import { prisma } from "@/lib/prisma";
import { getInternList } from "@/lib/queries/interns";

function toDateOnly(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

export type DailyNoteRow = {
  id: string;
  content: string;
  screenshotUrl: string | null;
  screenshotName: string | null;
  date: Date;
  createdAt: Date;
  user: { id: string; name: string };
};

export type DailyNotesStats = {
  todayCount: number;
  missingToday: number;
  topIntern: { name: string; count: number } | null;
  avgDaily: number;
  weeklyActivity: { label: string; count: number }[];
  recentSnippets: { name: string; content: string; createdAt: Date }[];
};

export async function getDailyNotesData(options: {
  userId?: string;
  admin: boolean;
}) {
  const today = toDateOnly(new Date());

  const [reports, interns, todayReport] = await Promise.all([
    prisma.dailyReport.findMany({
      where: options.admin ? {} : { userId: options.userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { user: { select: { id: true, name: true } } },
    }),
    options.admin ? getInternList() : Promise.resolve([]),
    options.admin || !options.userId
      ? Promise.resolve(null)
      : prisma.dailyReport.findUnique({
          where: {
            userId_date: { userId: options.userId, date: today },
          },
          include: { user: { select: { id: true, name: true } } },
        }),
  ]);

  let stats: DailyNotesStats | null = null;
  if (options.admin) {
    const weekStart = new Date(today);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    const todayReports = reports.filter(
      (r) => r.date.getTime() === today.getTime()
    );
    const reportedToday = new Set(todayReports.map((r) => r.userId));
    const missingToday = interns.filter((i) => !reportedToday.has(i.id)).length;

    const weekReports = reports.filter((r) => r.date >= weekStart);
    const byIntern = new Map<string, { name: string; count: number }>();
    for (const r of weekReports) {
      const e = byIntern.get(r.userId) ?? {
        name: r.user.name,
        count: 0,
      };
      e.count++;
      byIntern.set(r.userId, e);
    }
    let topIntern: DailyNotesStats["topIntern"] = null;
    for (const e of byIntern.values()) {
      if (!topIntern || e.count > topIntern.count) {
        topIntern = { name: e.name, count: e.count };
      }
    }

    const weeklyActivity: DailyNotesStats["weeklyActivity"] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.getTime();
      weeklyActivity.push({
        label: d.toLocaleDateString("tr-TR", {
          weekday: "short",
          timeZone: "UTC",
        }),
        count: reports.filter((r) => r.date.getTime() === key).length,
      });
    }

    const daysWithReports = new Set(
      weekReports.map((r) => r.date.toISOString().slice(0, 10))
    ).size;
    const avgDaily =
      daysWithReports > 0 ? weekReports.length / daysWithReports : 0;

    stats = {
      todayCount: todayReports.length,
      missingToday,
      topIntern,
      avgDaily,
      weeklyActivity,
      recentSnippets: reports.slice(0, 4).map((r) => ({
        name: r.user.name,
        content: r.content.slice(0, 80),
        createdAt: r.createdAt,
      })),
    };
  }

  return {
    reports: reports as DailyNoteRow[],
    interns,
    todayReport: todayReport as DailyNoteRow | null,
    stats,
  };
}
