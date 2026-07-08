"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Medal,
  Flame,
  Zap,
  Shield,
  Star,
  Target,
  Award,
  Crown,
  Loader2,
  TrendingUp,
} from "lucide-react";
import type { GamificationData } from "@/lib/queries/gamification";
import { declareWeeklyChampion } from "@/lib/actions/gamification";
import { MIN_WEEKLY_PARTICIPATION } from "@/lib/gamification/constants";
import { useDashboardDataOptional } from "@/components/dashboard-data-provider";
import { cn, mobileScrollX } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BADGE_ICONS = {
  flame: Flame,
  star: Star,
  zap: Zap,
  shield: Shield,
  trophy: Trophy,
  target: Target,
  award: Award,
} as const;

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="size-5 text-amber-500" />;
  if (rank === 2) return <Medal className="size-5 text-slate-400" />;
  if (rank === 3) return <Medal className="size-5 text-amber-700" />;
  return (
    <span className="flex size-5 items-center justify-center text-sm font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function PersonalSummary({
  score,
  teamAverage,
}: {
  score: NonNullable<GamificationData["currentUserScore"]>;
  teamAverage: number;
}) {
  const diff = score.totalScore - teamAverage;
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" />
          Senin Performansın
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold">{score.totalScore}</p>
            <p className="text-sm text-muted-foreground">Genel puan</p>
          </div>
          {score.rank > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">#{score.rank}</p>
              <p className="text-sm text-muted-foreground">Sıralama</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-semibold">
              Sv. {score.level} · {score.levelTitle}
            </p>
            <p className="text-sm text-muted-foreground">{score.xp} XP</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sonraki seviye</span>
            <span>{score.xpToNext} XP kaldı</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${score.levelProgress}%` }}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Ekip ortalaması: <strong>{teamAverage}</strong>
          {diff !== 0 && (
            <span
              className={cn(
                "ml-2",
                diff > 0 ? "text-emerald-600" : "text-red-500"
              )}
            >
              ({diff > 0 ? "+" : ""}
              {diff} puan)
            </span>
          )}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <ScoreBar
            label="Güvenilirlik"
            value={score.categoryScores.reliability}
            color="bg-blue-500"
          />
          <ScoreBar
            label="Hız"
            value={score.categoryScores.speed}
            color="bg-amber-500"
          />
          <ScoreBar
            label="Kalite"
            value={score.categoryScores.quality}
            color="bg-emerald-500"
          />
          <ScoreBar
            label="Seri"
            value={score.categoryScores.streak}
            color="bg-orange-500"
          />
        </div>

        {score.streakDays > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm">
            <Flame className="size-4 text-orange-500" />
            <span>
              <strong>{score.streakDays} gün</strong> aktif seri devam ediyor!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BadgeGrid({
  badges,
  earnedKeys,
}: {
  badges: GamificationData["badgesCatalog"];
  earnedKeys?: string[];
}) {
  const earnedSet = new Set(earnedKeys);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge) => {
        const earned = earnedKeys ? earnedSet.has(badge.key) : badge.earned;
        const Icon = BADGE_ICONS[badge.icon as keyof typeof BADGE_ICONS] ?? Star;
        return (
          <div
            key={badge.key}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition-colors",
              earned
                ? "border-primary/30 bg-primary/5"
                : "opacity-50 grayscale"
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                earned ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">{badge.label}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              {earned && badge.earnedAt && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(badge.earnedAt).toLocaleDateString("tr-TR")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LeaderboardBoard({
  data,
  isAdmin,
  currentUserId,
  variant = "full",
  headerAction,
}: {
  data: GamificationData;
  isAdmin: boolean;
  currentUserId: string;
  variant?: "full" | "embed";
  headerAction?: React.ReactNode;
}) {
  const router = useRouter();
  const dashboardData = useDashboardDataOptional();
  const [isPending, startTransition] = useTransition();

  const prevWeekStart = data.suggestedChampion
    ? new Date(data.weekStart)
    : null;
  if (prevWeekStart) {
    prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
  }

  function handleDeclareChampion(userId?: string) {
    if (!prevWeekStart) return;
    const fd = new FormData();
    fd.set("weekStart", prevWeekStart.toISOString());
    if (userId) fd.set("userId", userId);
    startTransition(async () => {
      await declareWeeklyChampion(fd);
      if (dashboardData) void dashboardData.refresh("gamification");
      else router.refresh();
    });
  }

  const eligible = data.leaderboard.filter((s) => s.eligible);
  const myScore = data.currentUserScore;

  if (variant === "embed") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-amber-500" />
            Liderlik Tablosu
          </CardTitle>
          <Link
            href="/liderlik"
            className="text-xs font-medium text-primary hover:underline"
          >
            Tümünü Gör
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {myScore && <PersonalSummary score={myScore} teamAverage={data.teamAverage} />}
          <ul className="space-y-2">
            {eligible.slice(0, 5).map((entry) => (
              <li
                key={entry.internId}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                  entry.internId === currentUserId && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <RankMedal rank={entry.rank} />
                  <span className="font-medium">{entry.name}</span>
                </div>
                <span className="font-semibold">{entry.totalScore}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Liderlik & Rozetler</h1>
          <p className="text-sm text-muted-foreground">
            Bu hafta ({data.weekLabel}) — oran bazlı adil sıralama
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerAction}
          {data.currentWeekChampion && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
            <Crown className="size-5 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Geçen Haftanın Stajyeri</p>
              <p className="font-semibold">{data.currentWeekChampion.userName}</p>
            </div>
          </div>
          )}
        </div>
      </div>

      {!isAdmin && myScore && (
        <PersonalSummary score={myScore} teamAverage={data.teamAverage} />
      )}

      {isAdmin && !data.currentWeekChampion && data.suggestedChampion && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3">
              <Crown className="size-8 text-amber-500" />
              <div>
                <p className="font-semibold">Haftanın Stajyerini İlan Et</p>
                <p className="text-sm text-muted-foreground">
                  Önerilen: {data.suggestedChampion.userName} (
                  {data.suggestedChampion.score} puan)
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleDeclareChampion()}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Crown />}
              Şampiyonu İlan Et
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{eligible.length}</p>
            <p className="text-xs text-muted-foreground">Sıralamaya giren</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{data.teamAverage}</p>
            <p className="text-xs text-muted-foreground">Ekip ortalaması</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{MIN_WEEKLY_PARTICIPATION}+</p>
            <p className="text-xs text-muted-foreground">Min. katılım eşiği</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{data.recentChampions.length}</p>
            <p className="text-xs text-muted-foreground">Haftalık şampiyon</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Haftalık Sıralama</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={mobileScrollX}>
            <table className="w-full min-w-[520px] text-sm sm:min-w-[640px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">Stajyer</th>
                  <th className="pb-2 pr-4 font-medium">Puan</th>
                  <th className="pb-2 pr-4 font-medium">Seviye</th>
                  <th className="pb-2 pr-4 font-medium">Tamamlama</th>
                  <th className="pb-2 pr-4 font-medium">Ofis</th>
                  <th className="pb-2 pr-4 font-medium">Hız</th>
                  <th className="pb-2 pr-4 font-medium">Kalite</th>
                  <th className="pb-2 font-medium">Seri</th>
                  {isAdmin && <th className="pb-2 pl-2 font-medium" />}
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((entry) => (
                  <tr
                    key={entry.internId}
                    className={cn(
                      "border-b border-border/50",
                      entry.internId === currentUserId && "bg-primary/5"
                    )}
                  >
                    <td className="py-3 pr-4">
                      {entry.eligible ? (
                        <RankMedal rank={entry.rank} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-medium">{entry.name}</td>
                    <td className="py-3 pr-4">
                      {entry.eligible ? (
                        <span className="font-bold">{entry.totalScore}</span>
                      ) : (
                        <Badge variant="muted">Yetersiz katılım</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {entry.level} · {entry.levelTitle}
                    </td>
                    <td className="py-3 pr-4">{entry.completionRate}%</td>
                    <td className="py-3 pr-4">{entry.officeRate}%</td>
                    <td className="py-3 pr-4">{entry.onTimeRate}%</td>
                    <td className="py-3 pr-4">{entry.qualityRate}%</td>
                    <td className="py-3">
                      {entry.streakDays > 0 ? (
                        <span className="flex items-center gap-1">
                          <Flame className="size-3.5 text-orange-500" />
                          {entry.streakDays}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    {isAdmin && entry.eligible && (
                      <td className="py-3 pl-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isPending}
                          onClick={() => handleDeclareChampion(entry.internId)}
                        >
                          <Crown className="size-3" />
                          Seç
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Puan = Tamamlama (%35) + Ofis (%20) + Zamanında teslim (%25) + Kalite
            (%20). Sıralamaya girmek için bu hafta en az {MIN_WEEKLY_PARTICIPATION}{" "}
            görev/ofis ataması gerekir.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rozetler</CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGrid
            badges={data.badgesCatalog}
            earnedKeys={myScore?.earnedBadgeKeys}
          />
        </CardContent>
      </Card>

      {data.recentChampions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Haftalık Şampiyonlar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recentChampions.map((c) => (
                <li
                  key={c.weekStart}
                  className="flex items-center justify-between rounded-md border px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="size-4 text-amber-500" />
                    <div>
                      <p className="font-medium">{c.userName}</p>
                      <p className="text-xs text-muted-foreground">{c.weekLabel}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{c.score} puan</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
