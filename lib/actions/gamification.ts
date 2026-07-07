"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { toDateOnly } from "@/lib/date";
import { getGamificationData } from "@/lib/queries/gamification";
import { createNotification } from "@/lib/actions/notifications";
import { logActivity } from "@/lib/activity";
import { BADGE_MAP } from "@/lib/gamification/constants";

export type GamificationActionResult = {
  ok: boolean;
  error?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return session.user;
}

/** Geçen haftanın şampiyonunu ilan eder (otomatik veya manuel seçim). */
export async function declareWeeklyChampion(
  formData: FormData
): Promise<GamificationActionResult> {
  const admin = await requireAdmin();

  const weekStartStr = String(formData.get("weekStart") ?? "");
  const userId = String(formData.get("userId") ?? "") || undefined;

  if (!weekStartStr) {
    return { ok: false, error: "Hafta bilgisi eksik." };
  }

  const weekStart = toDateOnly(new Date(weekStartStr));

  const existing = await prisma.weeklyChampion.findUnique({
    where: { weekStart },
  });
  if (existing) {
    return { ok: false, error: "Bu hafta için şampiyon zaten ilan edildi." };
  }

  const data = await getGamificationData({ syncBadges: false });

  let championId = userId;
  let championScore = 0;
  let championName = "";

  if (championId) {
    const found = data.leaderboard.find((s) => s.internId === championId);
    if (!found?.eligible) {
      return { ok: false, error: "Seçilen stajyer uygun değil." };
    }
    championScore = found.totalScore;
    championName = found.name;
  } else if (data.suggestedChampion) {
    championId = data.suggestedChampion.userId;
    championScore = data.suggestedChampion.score;
    championName = data.suggestedChampion.userName;
  } else {
    return { ok: false, error: "Şampiyon adayı bulunamadı." };
  }

  await prisma.weeklyChampion.create({
    data: {
      weekStart,
      userId: championId,
      score: championScore,
      autoSelected: !userId,
    },
  });

  const interns = await prisma.user.findMany({
    where: { role: "INTERN" },
    select: { id: true },
  });

  await Promise.all(
    interns.map((intern) =>
      createNotification({
        userId: intern.id,
        type: "WEEKLY_CHAMPION",
        title: "Haftanın Stajyeri",
        message:
          intern.id === championId
            ? `Tebrikler! ${championName}, haftanın stajyeri seçildi.`
            : `${championName} bu haftanın stajyeri olarak seçildi.`,
      })
    )
  );

  await logActivity(
    admin.id,
    "DECLARE_WEEKLY_CHAMPION",
    "/liderlik",
    `${championName} haftanın stajyeri ilan edildi`
  );

  revalidatePath("/liderlik");
  revalidatePath("/isler");
  return { ok: true };
}

/** Yeni kazanılan rozetler için bildirim gönderir (sayfa yüklemesinde). */
export async function notifyNewBadges(
  internId: string,
  badgeKeys: string[]
): Promise<void> {
  if (badgeKeys.length === 0) return;

  for (const key of badgeKeys) {
    const def = BADGE_MAP[key];
    if (!def) continue;
    await createNotification({
      userId: internId,
      type: "BADGE_EARNED",
      title: "Yeni Rozet!",
      message: `"${def.label}" rozetini kazandınız: ${def.description}`,
    });
  }
}
