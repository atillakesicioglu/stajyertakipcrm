import { prisma } from "@/lib/prisma";
import { isUnsetPasswordSync } from "@/lib/password";

export type InternDirectoryRow = {
  id: string;
  name: string;
  email: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  needsPasswordSetup: boolean;
  activeTasks: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  lastNote: { content: string; date: Date } | null;
  status: "active" | "pending" | "completed";
  recentTasks: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  }[];
};

export type InternDirectoryStats = {
  totalInterns: number;
  activeTasks: number;
  pendingSubmissions: number;
  avgPerformance: number;
};

export type InternDirectoryData = {
  interns: InternDirectoryRow[];
  stats: InternDirectoryStats;
  mentorName: string;
};

function internStatus(
  needsPasswordSetup: boolean,
  activeTasks: number,
  totalTasks: number
): InternDirectoryRow["status"] {
  if (needsPasswordSetup) return "pending";
  if (totalTasks > 0 && activeTasks === 0) return "completed";
  return "active";
}

export async function getInternDirectoryData(): Promise<InternDirectoryData> {
  const [interns, admin, allTasks, allReports] = await Promise.all([
    prisma.user.findMany({
      where: { role: "INTERN" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        lastLoginAt: true,
        createdAt: true,
        passwordHash: true,
        assignedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.dailyReport.findMany({
      orderBy: { date: "desc" },
      select: {
        userId: true,
        content: true,
        date: true,
      },
    }),
  ]);

  const latestNoteByUser = new Map<string, { content: string; date: Date }>();
  for (const r of allReports) {
    if (!latestNoteByUser.has(r.userId)) {
      latestNoteByUser.set(r.userId, {
        content: r.content,
        date: r.date,
      });
    }
  }

  const rows: InternDirectoryRow[] = interns.map((intern) => {
    const totalTasks = intern.assignedTasks.length;
    const completedTasks = intern.assignedTasks.filter(
      (t) => t.status === "APPROVED"
    ).length;
    const activeTasks = intern.assignedTasks.filter(
      (t) => t.status !== "APPROVED"
    ).length;
    const pendingSubmissions = intern.assignedTasks.filter(
      (t) => t.status === "SUBMITTED"
    ).length;

    const needsPasswordSetup = isUnsetPasswordSync(intern.passwordHash);

    return {
      id: intern.id,
      name: intern.name,
      email: intern.email,
      lastLoginAt: intern.lastLoginAt,
      createdAt: intern.createdAt,
      needsPasswordSetup,
      activeTasks,
      totalTasks,
      completedTasks,
      completionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      lastNote: latestNoteByUser.get(intern.id) ?? null,
      status: internStatus(needsPasswordSetup, activeTasks, totalTasks),
      recentTasks: intern.assignedTasks.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        createdAt: t.createdAt,
      })),
    };
  });

  const activeTasksTotal = rows.reduce((s, r) => s + r.activeTasks, 0);
  const pendingTotal = rows.reduce(
    (s, r) =>
      s +
      r.recentTasks.filter((t) => t.status === "SUBMITTED").length,
    0
  );
  const avgPerformance =
    rows.length > 0
      ? Math.round(
          rows.reduce((s, r) => s + r.completionRate, 0) / rows.length
        )
      : 0;

  const submittedCount =
    allTasks.find((t) => t.status === "SUBMITTED")?._count.status ?? 0;

  return {
    interns: rows,
    stats: {
      totalInterns: rows.length,
      activeTasks: activeTasksTotal,
      pendingSubmissions: submittedCount || pendingTotal,
      avgPerformance,
    },
    mentorName: admin?.name ?? "Yönetici",
  };
}

export async function getInternWeeklyProgress(internId: string) {
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);

  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: internId,
      updatedAt: { gte: weekStart },
    },
    select: { updatedAt: true, status: true },
  });

  const days: { label: string; percent: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setUTCDate(next.getUTCDate() + 1);

    const dayTasks = tasks.filter(
      (t) => t.updatedAt >= d && t.updatedAt < next
    );
    const approved = dayTasks.filter((t) => t.status === "APPROVED").length;
    const percent =
      dayTasks.length > 0
        ? Math.round((approved / dayTasks.length) * 100)
        : 0;

    days.push({
      label: d.toLocaleDateString("tr-TR", {
        weekday: "short",
        timeZone: "UTC",
      }),
      percent,
    });
  }

  return days;
}

export async function getWeeklyProgressForInterns(
  internIds: string[]
): Promise<Record<string, { label: string; percent: number }[]>> {
  if (internIds.length === 0) return {};

  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);

  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: { in: internIds },
      updatedAt: { gte: weekStart },
    },
    select: { assignedToId: true, updatedAt: true, status: true },
  });

  const result: Record<string, { label: string; percent: number }[]> = {};

  for (const internId of internIds) {
    const days: { label: string; percent: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);

      const dayTasks = tasks.filter(
        (t) =>
          t.assignedToId === internId &&
          t.updatedAt >= d &&
          t.updatedAt < next
      );
      const approved = dayTasks.filter((t) => t.status === "APPROVED").length;
      days.push({
        label: d.toLocaleDateString("tr-TR", {
          weekday: "short",
          timeZone: "UTC",
        }),
        percent:
          dayTasks.length > 0
            ? Math.round((approved / dayTasks.length) * 100)
            : 0,
      });
    }
    result[internId] = days;
  }

  return result;
}
