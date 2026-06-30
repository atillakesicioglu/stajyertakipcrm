import { prisma } from "@/lib/prisma";

export async function logActivity(
  userId: string,
  action: string,
  page?: string,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, page, details },
    });
  } catch (e) {
    console.error("Aktivite kaydedilemedi:", e);
  }
}
