"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { uploadScreenshot } from "@/lib/blob";

export type ReportActionResult = { ok: boolean; error?: string };

/** Verilen Date'i UTC gece yarısına normalize eder (00:00:00.000Z) */
function toDateOnly(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

export async function createDailyReport(
  _prev: ReportActionResult | undefined,
  formData: FormData
): Promise<ReportActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Oturum bulunamadı." };

  const user = session.user;

  // Admin rapor yazamaz
  if (user.role === "ADMIN") {
    return { ok: false, error: "Yöneticiler günlük rapor yazamaz." };
  }

  const content = String(formData.get("content") ?? "").trim();
  const file = formData.get("screenshot") as File | null;

  if (!content) {
    return { ok: false, error: "Rapor içeriği boş olamaz." };
  }

  // Bugünün tarihi sunucuda belirlenir — client'a güvenilmez
  const todayUTC = toDateOnly(new Date());

  // Aynı güne daha önce rapor yazılmış mı?
  const existing = await prisma.dailyReport.findUnique({
    where: { userId_date: { userId: user.id, date: todayUTC } },
  });

  if (existing) {
    return { ok: false, error: "Bugün için zaten bir rapor yazdınız." };
  }

  let screenshotUrl: string | undefined;
  let screenshotName: string | undefined;

  const hasFile = file && file.size > 0;
  if (hasFile) {
    try {
      const result = await uploadScreenshot(file);
      screenshotUrl = result.url;
      screenshotName = result.name;
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Dosya yüklenemedi.",
      };
    }
  }

  await prisma.dailyReport.create({
    data: {
      userId: user.id,
      content,
      date: todayUTC,
      screenshotUrl,
      screenshotName,
    },
  });

  await logActivity(
    user.id,
    "CREATE_REPORT",
    "/raporlar",
    "Günlük rapor oluşturdu"
  );

  revalidatePath("/raporlar");
  return { ok: true };
}
