import type { TaskStatus } from "@prisma/client";

export type BadgeVariant =
  | "info"
  | "warning"
  | "success"
  | "danger"
  | "muted";

export type TaskStatusConfigItem = {
  label: string;
  badge: BadgeVariant;
  order: number;
};

export type TaskStatusConfig = Record<TaskStatus, TaskStatusConfigItem>;

export const DEFAULT_TASK_STATUS_CONFIG: TaskStatusConfig = {
  ASSIGNED: { label: "Atandı", badge: "info", order: 0 },
  IN_PROGRESS: { label: "Devam Ediyor", badge: "warning", order: 1 },
  SUBMITTED: { label: "Teslim Edildi", badge: "muted", order: 2 },
  REVISION_REQUESTED: { label: "Revize Bekliyor", badge: "danger", order: 3 },
  APPROVED: { label: "Onaylandı", badge: "success", order: 4 },
};

export const DEFAULT_ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];
