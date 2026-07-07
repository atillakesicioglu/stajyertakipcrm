import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/queries/app-settings";
import { getWorkWeekDates, toDateOnly, formatWeekRangeLabel } from "@/lib/date";
import {
  scoreInternInRange,
  rankInterns,
  type InternScoreBreakdown,
} from "@/lib/gamification/scoring";
import { BADGE_DEFINITIONS, BADGE_MAP } from "@/lib/gamification/constants";

export type GamificationBadge = {
  key: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  earnedAt: string | null;
  earned: boolean;
};

export type WeeklyChampionInfo = {
  weekStart: string;
  weekLabel: string;
  userId: string;
  userName: string;
  score: number;
  autoSelected: boolean;
  announcedAt: string;
};

export type GamificationData = {
  weekLabel: string;
  weekStart: string;
  rangeLabel: string;
  leaderboard: (InternScoreBreakdown & { rank: number })[];
  currentUserScore: (InternScoreBreakdown & { rank: number }) | null;
  teamAverage: number;
  badgesCatalog: GamificationBadge[];
  recentChampions: WeeklyChampionInfo[];
  currentWeekChampion: WeeklyChampionInfo | null;
  suggestedChampion: { userId: string; userName: string; score: number } | null;
};

function endOfDay(d: Date): Date {
  const x = toDateOnly(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function getPreviousWeekStart(weekStart: Date): Date {
  const prev = new Date(weekStart);
  prev.setUTCDate(prev.getUTCDate() - 7);
  return prev;
}

async function fetchGamificationRaw() {
  const settings = await getAppSettings();
  const weekDates = getWorkWeekDates(new Date(), settings.weekStartDay);
  const weekStart = weekDates[0]!;
  const weekEnd = endOfDay(weekDates[weekDates.length - 1]!);

  const [interns, tasks, officeAssignments, dailyReports, badges, champions] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: "INTERN" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.task.findMany({
        select: {
          id: true,
          assignedToId: true,
          status: true,
          priority: true,
          dueDate: true,
          approvedAt: true,
          createdAt: true,
          submissions: {
            orderBy: { submittedAt: "asc" },
            take: 1,
            select: { submittedAt: true },
          },
          revisions: { select: { id: true } },
        },
      }),
      prisma.officeTaskAssignment.findMany({
        select: {
          userId: true,
          date: true,
          completed: true,
          completedAt: true,
        },
      }),
      prisma.dailyReport.findMany({
        select: { userId: true, date: true },
      }),
      prisma.userBadge.findMany({
        select: { userId: true, badgeKey: true, earnedAt: true },
      }),
      prisma.weeklyChampion.findMany({
        orderBy: { weekStart: "desc" },
        take: 8,
        include: { user: { select: { name: true } } },
      }),
    ]);

  return {
    weekDates,
    weekStart,
    weekEnd,
    interns,
    tasks,
    officeAssignments,
    dailyReports,
    badges,
    champions,
  };
}

export const getGamificationData = cache(
  async (options?: {
    userId?: string;
    syncBadges?: boolean;
  }): Promise<GamificationData> => {
    const raw = await fetchGamificationRaw();
    const {
      weekDates,
      weekStart,
      weekEnd,
      interns,
      tasks,
      officeAssignments,
      dailyReports,
      badges,
      champions,
    } = raw;

    const rangeTasks = tasks.filter((t) => {
      if (t.createdAt > weekEnd) return false;
      if (
        t.status === "APPROVED" &&
        t.approvedAt &&
        t.approvedAt < weekStart
      ) {
        return false;
      }
      return true;
    });
    const rangeOffice = officeAssignments.filter(
      (o) => o.date >= weekStart && o.date <= weekEnd
    );
    const rangeReports = dailyReports.filter(
      (r) => r.date >= weekStart && r.date <= weekEnd
    );

    const badgesByUser = new Map<string, { key: string; earnedAt: Date }[]>();
    for (const b of badges) {
      const list = badgesByUser.get(b.userId) ?? [];
      list.push({ key: b.badgeKey, earnedAt: b.earnedAt });
      badgesByUser.set(b.userId, list);
    }

    const scores = interns.map((intern) => {
      const userBadges = badgesByUser.get(intern.id) ?? [];
      return scoreInternInRange(
        intern.id,
        intern.name,
        rangeTasks,
        rangeOffice,
        rangeReports,
        tasks,
        officeAssignments,
        dailyReports,
        userBadges.map((b) => b.key)
      );
    });

    if (options?.syncBadges !== false) {
      const toCreate: { userId: string; badgeKey: string }[] = [];
      for (const s of scores) {
        for (const key of s.newlyEarnedBadgeKeys) {
          toCreate.push({ userId: s.internId, badgeKey: key });
        }
      }
      if (toCreate.length > 0) {
        await prisma.userBadge.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
        for (const row of toCreate) {
          const entry = scores.find((s) => s.internId === row.userId);
          if (entry && !entry.earnedBadgeKeys.includes(row.badgeKey)) {
            entry.earnedBadgeKeys.push(row.badgeKey);
          }
        }
      }
    }

    const ranked = rankInterns(scores);
    let rankCounter = 0;
    const leaderboard = ranked.map((s) => ({
      ...s,
      rank: s.eligible ? ++rankCounter : 0,
    }));

    const eligibleScores = leaderboard.filter((s) => s.eligible);
    const teamAverage =
      eligibleScores.length > 0
        ? Math.round(
            eligibleScores.reduce((sum, s) => sum + s.totalScore, 0) /
              eligibleScores.length
          )
        : 0;

    const currentUserScore = options?.userId
      ? (leaderboard.find((s) => s.internId === options.userId) ?? null)
      : null;

    const prevWeekStart = getPreviousWeekStart(weekStart);
    const prevWeekDates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(prevWeekStart);
      d.setUTCDate(d.getUTCDate() + i);
      return toDateOnly(d);
    });

    const prevScores = interns.map((intern) => {
      const ps = prevWeekStart;
      const pe = endOfDay(prevWeekDates[4]!);
      const prevRangeTasks = tasks.filter((t) => {
        if (t.createdAt > pe) return false;
        if (t.status === "APPROVED" && t.approvedAt && t.approvedAt < ps) {
          return false;
        }
        return true;
      });
      return scoreInternInRange(
        intern.id,
        intern.name,
        prevRangeTasks,
        officeAssignments.filter((o) => o.date >= ps && o.date <= pe),
        dailyReports.filter((r) => r.date >= ps && r.date <= pe),
        tasks,
        officeAssignments,
        dailyReports,
        (badgesByUser.get(intern.id) ?? []).map((b) => b.key)
      );
    });
    const prevRanked = rankInterns(prevScores).filter((s) => s.eligible);
    const topPrev = prevRanked[0];

    const currentWeekChampion =
      champions.find(
        (c) => c.weekStart.getTime() === prevWeekStart.getTime()
      ) ?? null;

    const recentChampions: WeeklyChampionInfo[] = champions.map((c) => ({
      weekStart: c.weekStart.toISOString(),
      weekLabel: formatWeekRangeLabel(
        Array.from({ length: 5 }, (_, i) => {
          const d = new Date(c.weekStart);
          d.setUTCDate(d.getUTCDate() + i);
          return toDateOnly(d);
        })
      ),
      userId: c.userId,
      userName: c.user.name,
      score: c.score,
      autoSelected: c.autoSelected,
      announcedAt: c.announcedAt.toISOString(),
    }));

    const userBadgeKeys = options?.userId
      ? new Set(
          (badgesByUser.get(options.userId) ?? []).map((b) => b.key)
        )
      : new Set<string>();

    const badgesCatalog: GamificationBadge[] = BADGE_DEFINITIONS.map((def) => {
      const earned = options?.userId
        ? userBadgeKeys.has(def.key)
        : false;
      const earnedRecord = options?.userId
        ? (badgesByUser.get(options.userId) ?? []).find((b) => b.key === def.key)
        : null;
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        icon: def.icon,
        category: def.category,
        earned,
        earnedAt: earnedRecord?.earnedAt.toISOString() ?? null,
      };
    });

    return {
      weekLabel: formatWeekRangeLabel(weekDates),
      weekStart: weekStart.toISOString(),
      rangeLabel: formatWeekRangeLabel(weekDates),
      leaderboard,
      currentUserScore,
      teamAverage,
      badgesCatalog,
      recentChampions,
      currentWeekChampion: currentWeekChampion
        ? {
            weekStart: currentWeekChampion.weekStart.toISOString(),
            weekLabel: formatWeekRangeLabel(prevWeekDates),
            userId: currentWeekChampion.userId,
            userName: currentWeekChampion.user.name,
            score: currentWeekChampion.score,
            autoSelected: currentWeekChampion.autoSelected,
            announcedAt: currentWeekChampion.announcedAt.toISOString(),
          }
        : null,
      suggestedChampion: topPrev
        ? {
            userId: topPrev.internId,
            userName: topPrev.name,
            score: topPrev.totalScore,
          }
        : null,
    };
  }
);

export async function getInternGamificationProfile(internId: string) {
  const data = await getGamificationData({ userId: internId });
  const score = data.leaderboard.find((s) => s.internId === internId);
  const badges = score?.earnedBadgeKeys
    .map((key) => {
      const def = BADGE_MAP[key];
      if (!def) return null;
      const catalog = data.badgesCatalog.find((b) => b.key === key);
      return {
        ...def,
        earnedAt: catalog?.earnedAt ?? null,
      };
    })
    .filter(Boolean);

  return { score: score ?? null, badges: badges ?? [] };
}
