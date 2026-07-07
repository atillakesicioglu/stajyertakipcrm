import type { Priority, TaskStatus } from "@prisma/client";
import {
  MIN_WEEKLY_PARTICIPATION,
  SCORE_WEIGHTS,
  XP_REWARDS,
  levelFromXp,
  type BadgeDefinition,
  BADGE_DEFINITIONS,
} from "@/lib/gamification/constants";
import { toDateOnly, isSameDateOnly } from "@/lib/date";

export type TaskRow = {
  id: string;
  assignedToId: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  submissions: { submittedAt: Date }[];
  revisions: { id: string }[];
};

export type OfficeRow = {
  userId: string;
  date: Date;
  completed: boolean;
  completedAt: Date | null;
};

export type DailyReportRow = {
  userId: string;
  date: Date;
};

export type EarnedBadgeInput = {
  badgeKey: string;
  earnedAt: Date;
};

export type InternScoreBreakdown = {
  internId: string;
  name: string;
  eligible: boolean;
  totalScore: number;
  completionRate: number;
  officeRate: number;
  onTimeRate: number;
  qualityRate: number;
  streakDays: number;
  xp: number;
  level: number;
  levelTitle: string;
  levelProgress: number;
  xpToNext: number;
  categoryScores: {
    reliability: number;
    speed: number;
    quality: number;
    streak: number;
  };
  participation: {
    tasksAssigned: number;
    tasksApproved: number;
    tasksSubmitted: number;
    officeAssigned: number;
    officeCompleted: number;
    dailyReports: number;
    total: number;
  };
  earnedBadgeKeys: string[];
  newlyEarnedBadgeKeys: string[];
};

function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function isOnTime(task: TaskRow): boolean {
  if (!task.dueDate || task.submissions.length === 0) return false;
  const first = task.submissions[0]!.submittedAt;
  return first.getTime() <= task.dueDate.getTime();
}

function computeStreak(
  internId: string,
  officeRows: OfficeRow[],
  reportRows: DailyReportRow[],
  reference = new Date()
): number {
  const activeDays = new Set<string>();

  for (const o of officeRows) {
    if (o.userId !== internId) continue;
    if (o.completed) activeDays.add(toDateOnly(o.date).toISOString());
  }
  for (const r of reportRows) {
    if (r.userId !== internId) continue;
    activeDays.add(toDateOnly(r.date).toISOString());
  }

  let streak = 0;
  const cursor = toDateOnly(reference);
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString();
    const isWeekend = cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6;
    if (!isWeekend) {
      if (activeDays.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function computeXp(
  internId: string,
  allTasks: TaskRow[],
  allOffice: OfficeRow[],
  allReports: DailyReportRow[]
): number {
  let xp = 0;
  const tasks = allTasks.filter((t) => t.assignedToId === internId);

  for (const task of tasks) {
    if (task.status !== "APPROVED") continue;
    xp += XP_REWARDS.taskApproved[task.priority];
    if (isOnTime(task)) xp += XP_REWARDS.onTimeBonus;
    if (task.revisions.length === 0 && task.submissions.length > 0) {
      xp += XP_REWARDS.noRevisionBonus;
    }
  }

  for (const o of allOffice) {
    if (o.userId !== internId || !o.completed) continue;
    if (o.completedAt && isSameDateOnly(o.completedAt, o.date)) {
      xp += XP_REWARDS.officeSameDay;
    } else {
      xp += Math.round(XP_REWARDS.officeSameDay / 2);
    }
  }

  xp += allReports.filter((r) => r.userId === internId).length * XP_REWARDS.dailyReport;

  const streak = computeStreak(internId, allOffice, allReports);
  xp += streak * XP_REWARDS.streakDay;

  return xp;
}

function detectNewBadges(
  internId: string,
  allTasks: TaskRow[],
  allOffice: OfficeRow[],
  allReports: DailyReportRow[],
  existingKeys: Set<string>
): string[] {
  const tasks = allTasks.filter((t) => t.assignedToId === internId);
  const approved = tasks.filter((t) => t.status === "APPROVED").length;
  const submitted = tasks.filter(
    (t) =>
      t.status === "SUBMITTED" ||
      t.status === "APPROVED" ||
      t.status === "REVISION_REQUESTED"
  ).length;
  const withRevision = tasks.filter((t) => t.revisions.length > 0).length;
  const dueTasks = tasks.filter((t) => t.dueDate);
  const onTimeCount = dueTasks.filter(isOnTime).length;

  const officeMine = allOffice.filter((o) => o.userId === internId);
  const officeDone = officeMine.filter((o) => o.completed).length;

  const completionRate = pct(approved, tasks.length);
  const officeRate = pct(officeDone, officeMine.length);
  const qualityRate =
    submitted > 0 ? pct(submitted - withRevision, submitted) : 0;
  const onTimeRate = pct(onTimeCount, dueTasks.length);
  const streak = computeStreak(internId, allOffice, allReports);
  const totalParticipation = tasks.length + officeMine.length;

  const candidates: string[] = [];

  if (approved >= 1) candidates.push("first_approved");
  if (approved >= 10) candidates.push("tasks_10");
  if (approved >= 50) candidates.push("tasks_50");
  if (streak >= 7) candidates.push("streak_7");
  if (streak >= 30) candidates.push("streak_30");
  if (submitted >= 10 && qualityRate >= 90) candidates.push("quality_master");
  if (dueTasks.length >= 5 && onTimeRate >= 90) candidates.push("on_time_pro");
  if (officeMine.length >= 10 && officeRate >= 95) candidates.push("office_hero");
  if (totalParticipation >= 15 && completionRate >= 85 && officeRate >= 80) {
    candidates.push("reliable");
  }

  return candidates.filter((k) => !existingKeys.has(k));
}

export function scoreInternInRange(
  internId: string,
  name: string,
  rangeTasks: TaskRow[],
  rangeOffice: OfficeRow[],
  rangeReports: DailyReportRow[],
  allTasks: TaskRow[],
  allOffice: OfficeRow[],
  allReports: DailyReportRow[],
  existingBadgeKeys: string[]
): InternScoreBreakdown {
  const tasks = rangeTasks.filter((t) => t.assignedToId === internId);
  const office = rangeOffice.filter((o) => o.userId === internId);
  const reports = rangeReports.filter((r) => r.userId === internId);

  const approved = tasks.filter((t) => t.status === "APPROVED").length;
  const submitted = tasks.filter(
    (t) =>
      t.status === "SUBMITTED" ||
      t.status === "APPROVED" ||
      t.status === "REVISION_REQUESTED"
  ).length;
  const withRevision = tasks.filter((t) => t.revisions.length > 0).length;
  const dueTasks = tasks.filter((t) => t.dueDate);
  const onTimeCount = dueTasks.filter(isOnTime).length;
  const officeDone = office.filter((o) => o.completed).length;

  const completionRate = pct(approved, tasks.length);
  const officeRate = pct(officeDone, office.length);
  const qualityRate =
    submitted > 0 ? pct(submitted - withRevision, submitted) : 0;
  const onTimeRate = pct(onTimeCount, dueTasks.length);
  const streakDays = computeStreak(internId, allOffice, allReports);

  const totalParticipation = tasks.length + office.length;
  const eligible = totalParticipation >= MIN_WEEKLY_PARTICIPATION;

  const totalScore = eligible
    ? Math.round(
        completionRate * SCORE_WEIGHTS.completion +
          officeRate * SCORE_WEIGHTS.office +
          onTimeRate * SCORE_WEIGHTS.onTime +
          qualityRate * SCORE_WEIGHTS.quality
      )
    : 0;

  const xp = computeXp(internId, allTasks, allOffice, allReports);
  const levelInfo = levelFromXp(xp);

  const existingSet = new Set(existingBadgeKeys);
  const newlyEarnedBadgeKeys = detectNewBadges(
    internId,
    allTasks,
    allOffice,
    allReports,
    existingSet
  );
  const earnedBadgeKeys = [
    ...existingBadgeKeys,
    ...newlyEarnedBadgeKeys,
  ];

  return {
    internId,
    name,
    eligible,
    totalScore,
    completionRate,
    officeRate,
    onTimeRate,
    qualityRate,
    streakDays,
    xp,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    levelProgress: levelInfo.progress,
    xpToNext: levelInfo.xpToNext,
    categoryScores: {
      reliability: Math.round(completionRate * 0.6 + officeRate * 0.4),
      speed: onTimeRate,
      quality: qualityRate,
      streak: Math.min(100, streakDays * 10),
    },
    participation: {
      tasksAssigned: tasks.length,
      tasksApproved: approved,
      tasksSubmitted: submitted,
      officeAssigned: office.length,
      officeCompleted: officeDone,
      dailyReports: reports.length,
      total: totalParticipation,
    },
    earnedBadgeKeys,
    newlyEarnedBadgeKeys,
  };
}

export function rankInterns(scores: InternScoreBreakdown[]): InternScoreBreakdown[] {
  const eligible = scores
    .filter((s) => s.eligible)
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return a.name.localeCompare(b.name, "tr");
    });

  const ineligible = scores
    .filter((s) => !s.eligible)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return [...eligible, ...ineligible];
}

export function getBadgeDefinition(key: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.key === key);
}
