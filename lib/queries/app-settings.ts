import { cache } from "react";
import type { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TASK_STATUS_CONFIG,
  DEFAULT_ALLOWED_FILE_TYPES,
  type TaskStatusConfig,
  type TaskStatusConfigItem,
  type BadgeVariant,
} from "@/lib/app-settings-defaults";

export type AppSettingsData = {
  id: string;
  companyName: string;
  language: string;
  timezone: string;
  dateFormat: string;
  weekStartDay: number;
  currency: string;
  reminderTime: string;
  autoLogoutMinutes: number;
  notifyTaskAssigned: boolean;
  notifyTaskSubmitted: boolean;
  notifyTaskApproved: boolean;
  notifyTaskRevision: boolean;
  notifyDeadline: boolean;
  notifyComment: boolean;
  notifyDailySummary: boolean;
  primaryColor: string | null;
  successColor: string | null;
  warningColor: string | null;
  dangerColor: string | null;
  infoColor: string | null;
  neutralColor: string | null;
  maxFileSizeMb: number;
  maxStorageMb: number;
  allowedFileTypes: string[];
  virusScanEnabled: boolean;
  taskStatusConfig: TaskStatusConfig;
  updatedAt: Date;
};

function parseTaskStatusConfig(raw: unknown): TaskStatusConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TASK_STATUS_CONFIG };
  }
  const config = { ...DEFAULT_TASK_STATUS_CONFIG };
  for (const key of Object.keys(DEFAULT_TASK_STATUS_CONFIG) as TaskStatus[]) {
    const item = (raw as Record<string, unknown>)[key];
    if (item && typeof item === "object") {
      const entry = item as Partial<TaskStatusConfigItem>;
      config[key] = {
        label:
          typeof entry.label === "string"
            ? entry.label
            : DEFAULT_TASK_STATUS_CONFIG[key].label,
        badge: isBadgeVariant(entry.badge)
          ? entry.badge
          : DEFAULT_TASK_STATUS_CONFIG[key].badge,
        order:
          typeof entry.order === "number"
            ? entry.order
            : DEFAULT_TASK_STATUS_CONFIG[key].order,
      };
    }
  }
  return config;
}

function isBadgeVariant(value: unknown): value is BadgeVariant {
  return (
    value === "info" ||
    value === "warning" ||
    value === "success" ||
    value === "danger" ||
    value === "muted"
  );
}

function normalizeSettings(
  row: Awaited<ReturnType<typeof prisma.appSettings.findUnique>>
): AppSettingsData {
  if (!row) {
    return {
      id: "default",
      companyName: "Stajyer CRM",
      language: "tr",
      timezone: "Europe/Istanbul",
      dateFormat: "d MMMM yyyy",
      weekStartDay: 1,
      currency: "TRY",
      reminderTime: "09:00",
      autoLogoutMinutes: 60,
      notifyTaskAssigned: true,
      notifyTaskSubmitted: true,
      notifyTaskApproved: true,
      notifyTaskRevision: true,
      notifyDeadline: true,
      notifyComment: true,
      notifyDailySummary: true,
      primaryColor: null,
      successColor: null,
      warningColor: null,
      dangerColor: null,
      infoColor: null,
      neutralColor: null,
      maxFileSizeMb: 5,
      maxStorageMb: 1000,
      allowedFileTypes: [...DEFAULT_ALLOWED_FILE_TYPES],
      virusScanEnabled: false,
      taskStatusConfig: { ...DEFAULT_TASK_STATUS_CONFIG },
      updatedAt: new Date(),
    };
  }

  return {
    ...row,
    allowedFileTypes:
      row.allowedFileTypes.length > 0
        ? row.allowedFileTypes
        : [...DEFAULT_ALLOWED_FILE_TYPES],
    taskStatusConfig: parseTaskStatusConfig(row.taskStatusConfig),
  };
}

export const getAppSettings = cache(async (): Promise<AppSettingsData> => {
  let row = await prisma.appSettings.findUnique({
    where: { id: "default" },
  });

  if (!row) {
    row = await prisma.appSettings.create({
      data: {
        id: "default",
        taskStatusConfig: DEFAULT_TASK_STATUS_CONFIG,
      },
    });
  }

  return normalizeSettings(row);
});

export async function getTaskStatusDisplay(): Promise<{
  labels: Record<TaskStatus, string>;
  badges: Record<TaskStatus, BadgeVariant>;
  ordered: { status: TaskStatus; label: string; badge: BadgeVariant }[];
}> {
  const settings = await getAppSettings();
  const labels = {} as Record<TaskStatus, string>;
  const badges = {} as Record<TaskStatus, BadgeVariant>;

  for (const status of Object.keys(
    DEFAULT_TASK_STATUS_CONFIG
  ) as TaskStatus[]) {
    labels[status] = settings.taskStatusConfig[status].label;
    badges[status] = settings.taskStatusConfig[status].badge;
  }

  const ordered = (Object.keys(settings.taskStatusConfig) as TaskStatus[])
    .map((status) => ({
      status,
      label: settings.taskStatusConfig[status].label,
      badge: settings.taskStatusConfig[status].badge,
      order: settings.taskStatusConfig[status].order,
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ status, label, badge }) => ({ status, label, badge }));

  return { labels, badges, ordered };
}
