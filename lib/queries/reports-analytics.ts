import type { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTaskStatusDisplay } from "@/lib/queries/app-settings";

export type TrendMetric = {
  value: number;
  previousValue: number;
  changePercent: number;
};

export type ReportsAnalytics = {
  range: { from: string; to: string };
  kpis: {
    totalTasks: TrendMetric;
    completedTasks: TrendMetric;
    revisedTasks: TrendMetric;
    approvedTasks: TrendMetric;
    approvalRate: TrendMetric;
    avgDurationDays: TrendMetric;
  };
  completionRate: number;
  revisionRate: number;
  statusDistribution: {
    status: TaskStatus;
    label: string;
    count: number;
    percent: number;
    color: string;
  }[];
  weeklyTrend: {
    label: string;
    created: number;
    completed: number;
  }[];
  internRanking: {
    id: string;
    name: string;
    completed: number;
    approvalRate: number;
    maxCompleted: number;
  }[];
  dailyNoteStats: {
    date: string;
    label: string;
    count: number;
  }[];
  internDetails: {
    id: string;
    name: string;
    completed: number;
    revised: number;
    approved: number;
    approvalRate: number;
    avgResponseDays: number;
  }[];
  totals: {
    completed: number;
    revised: number;
    approved: number;
    approvalRate: number;
    avgResponseDays: number;
  };
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  ASSIGNED: "#3b82f6",
  IN_PROGRESS: "#6366f1",
  SUBMITTED: "#94a3b8",
  APPROVED: "#f59e0b",
  REVISION_REQUESTED: "#ec4899",
};

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfDay(d: Date): Date {
  const x = toDateOnly(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function calcTrend(value: number, previousValue: number): TrendMetric {
  const changePercent =
    previousValue === 0
      ? value > 0
        ? 100
        : 0
      : ((value - previousValue) / previousValue) * 100;
  return { value, previousValue, changePercent };
}

function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function getDefaultRange() {
  const to = toDateOnly(new Date());
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: toDateOnly(from), to };
}

function parseRange(fromStr?: string, toStr?: string) {
  if (!fromStr || !toStr) return getDefaultRange();
  const from = toDateOnly(new Date(fromStr));
  const to = endOfDay(new Date(toStr));
  if (from > to) return getDefaultRange();
  return { from, to };
}

function previousRange(from: Date, to: Date) {
  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const prevTo = new Date(from);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (days - 1));
  return { from: toDateOnly(prevFrom), to: endOfDay(prevTo) };
}

async function fetchTasksInRange(from: Date, to: Date) {
  return prisma.task.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      assignedToId: true,
      assignedTo: { select: { id: true, name: true } },
      submissions: {
        select: { submittedAt: true },
        orderBy: { submittedAt: "asc" },
        take: 1,
      },
      revisions: { select: { id: true } },
    },
  });
}

function computeMetrics(tasks: Awaited<ReturnType<typeof fetchTasksInRange>>) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.submissions.length > 0).length;
  const revised = tasks.filter((t) => t.revisions.length > 0).length;
  const approved = tasks.filter((t) => t.status === "APPROVED").length;
  const submitted = tasks.filter(
    (t) =>
      t.status === "SUBMITTED" ||
      t.status === "APPROVED" ||
      t.status === "REVISION_REQUESTED"
  ).length;
  const approvalRate = submitted > 0 ? (approved / submitted) * 100 : 0;

  const durations = tasks
    .map((t) => {
      const firstSubmission = t.submissions[0]?.submittedAt;
      if (!firstSubmission) return null;
      return daysBetween(t.createdAt, firstSubmission);
    })
    .filter((d): d is number => d !== null);

  const avgDurationDays =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  return { total, completed, revised, approved, approvalRate, avgDurationDays };
}

function buildInternDetails(
  tasks: Awaited<ReturnType<typeof fetchTasksInRange>>
) {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      completed: number;
      revised: number;
      approved: number;
      submitted: number;
      responseDays: number[];
    }
  >();

  for (const task of tasks) {
    const entry = map.get(task.assignedToId) ?? {
      id: task.assignedTo.id,
      name: task.assignedTo.name,
      completed: 0,
      revised: 0,
      approved: 0,
      submitted: 0,
      responseDays: [],
    };

    if (task.submissions.length > 0) entry.completed++;
    if (task.revisions.length > 0) entry.revised++;
    if (task.status === "APPROVED") entry.approved++;
    if (
      task.status === "SUBMITTED" ||
      task.status === "APPROVED" ||
      task.status === "REVISION_REQUESTED"
    ) {
      entry.submitted++;
    }

    const firstSubmission = task.submissions[0]?.submittedAt;
    if (firstSubmission) {
      entry.responseDays.push(daysBetween(task.createdAt, firstSubmission));
    }

    map.set(task.assignedToId, entry);
  }

  return Array.from(map.values())
    .map((e) => ({
      id: e.id,
      name: e.name,
      completed: e.completed,
      revised: e.revised,
      approved: e.approved,
      approvalRate: e.submitted > 0 ? (e.approved / e.submitted) * 100 : 0,
      avgResponseDays:
        e.responseDays.length > 0
          ? e.responseDays.reduce((a, b) => a + b, 0) / e.responseDays.length
          : 0,
    }))
    .sort((a, b) => b.completed - a.completed);
}

function buildWeeklyTrend(
  tasks: Awaited<ReturnType<typeof fetchTasksInRange>>,
  from: Date,
  to: Date
) {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setUTCDate(end.getUTCDate() + 6);
    if (end > to) end.setTime(to.getTime());
    weeks.push({
      start: new Date(start),
      end: new Date(end),
      label: formatShortDate(start),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
    if (weeks.length >= 6) break;
  }

  return weeks.map((week) => {
    const inWeek = (d: Date) => d >= week.start && d <= week.end;
    return {
      label: week.label,
      created: tasks.filter((t) => inWeek(t.createdAt)).length,
      completed: tasks.filter((t) =>
        t.submissions.some((s) => inWeek(s.submittedAt))
      ).length,
    };
  });
}

export async function getReportsAnalytics(
  fromStr?: string,
  toStr?: string
): Promise<ReportsAnalytics> {
  const { from, to } = parseRange(fromStr, toStr);
  const prev = previousRange(from, to);

  const [tasks, prevTasks, dailyReports, statusDisplay] = await Promise.all([
    fetchTasksInRange(from, to),
    fetchTasksInRange(prev.from, prev.to),
    prisma.dailyReport.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true },
    }),
    getTaskStatusDisplay(),
  ]);

  const current = computeMetrics(tasks);
  const previous = computeMetrics(prevTasks);
  const internDetails = buildInternDetails(tasks);

  const statusCounts = new Map<TaskStatus, number>();
  for (const task of tasks) {
    statusCounts.set(task.status, (statusCounts.get(task.status) ?? 0) + 1);
  }

  const statusDistribution = (
    Object.keys(statusDisplay.labels) as TaskStatus[]
  ).map((status) => {
    const count = statusCounts.get(status) ?? 0;
    return {
      status,
      label: statusDisplay.labels[status],
      count,
      percent: current.total > 0 ? (count / current.total) * 100 : 0,
      color: STATUS_COLORS[status],
    };
  });

  const dailyMap = new Map<string, number>();
  for (const report of dailyReports) {
    const key = report.date.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }

  const dailyNoteStats: ReportsAnalytics["dailyNoteStats"] = [];
  const dayCursor = new Date(from);
  while (dayCursor <= to) {
    const key = dayCursor.toISOString().slice(0, 10);
    dailyNoteStats.push({
      date: key,
      label: formatShortDate(dayCursor),
      count: dailyMap.get(key) ?? 0,
    });
    dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    if (dailyNoteStats.length >= 31) break;
  }

  const maxCompleted = Math.max(1, ...internDetails.map((i) => i.completed));

  const avgResponseDays =
    internDetails.length > 0
      ? internDetails.reduce((s, r) => s + r.avgResponseDays, 0) /
        internDetails.length
      : 0;

  return {
    range: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    kpis: {
      totalTasks: calcTrend(current.total, previous.total),
      completedTasks: calcTrend(current.completed, previous.completed),
      revisedTasks: calcTrend(current.revised, previous.revised),
      approvedTasks: calcTrend(current.approved, previous.approved),
      approvalRate: calcTrend(current.approvalRate, previous.approvalRate),
      avgDurationDays: calcTrend(
        current.avgDurationDays,
        previous.avgDurationDays
      ),
    },
    completionRate:
      current.total > 0 ? (current.completed / current.total) * 100 : 0,
    revisionRate:
      current.total > 0 ? (current.revised / current.total) * 100 : 0,
    statusDistribution,
    weeklyTrend: buildWeeklyTrend(tasks, from, to),
    internRanking: internDetails.slice(0, 5).map((i) => ({
      id: i.id,
      name: i.name,
      completed: i.completed,
      approvalRate: i.approvalRate,
      maxCompleted,
    })),
    dailyNoteStats,
    internDetails,
    totals: {
      completed: internDetails.reduce((s, r) => s + r.completed, 0),
      revised: internDetails.reduce((s, r) => s + r.revised, 0),
      approved: internDetails.reduce((s, r) => s + r.approved, 0),
      approvalRate: current.approvalRate,
      avgResponseDays,
    },
  };
}
