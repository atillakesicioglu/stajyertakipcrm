"use server";

import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getAppSettings } from "@/lib/queries/app-settings";

const NOTIFICATION_TOGGLES: Record<
  NotificationType,
  keyof Awaited<ReturnType<typeof getAppSettings>>
> = {
  TASK_ASSIGNED: "notifyTaskAssigned",
  TASK_SUBMITTED: "notifyTaskSubmitted",
  TASK_APPROVED: "notifyTaskApproved",
  TASK_REVISION: "notifyTaskRevision",
};

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedTaskId?: string;
}) {
  const settings = await getAppSettings();
  const toggleKey = NOTIFICATION_TOGGLES[params.type];
  if (toggleKey && !settings[toggleKey]) {
    return;
  }

  await prisma.notification.create({ data: params });
}

export async function getNotifications() {
  const session = await getSession();
  if (!session?.user) return { items: [], unread: 0 };

  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unread = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return { items, unread };
}

export async function markNotificationRead(id: string) {
  const session = await getSession();
  if (!session?.user) return;

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { read: true },
  });
}

export async function markAllNotificationsRead() {
  const session = await getSession();
  if (!session?.user) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });
}
