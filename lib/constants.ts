import type { Priority, TaskStatus, NotificationType } from "@prisma/client";

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
};

export const PRIORITY_BADGE: Record<
  Priority,
  "muted" | "warning" | "danger"
> = {
  LOW: "muted",
  MEDIUM: "warning",
  HIGH: "danger",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  ASSIGNED: "Atandı",
  IN_PROGRESS: "Devam Ediyor",
  SUBMITTED: "Teslim Edildi",
  APPROVED: "Onaylandı",
  REVISION_REQUESTED: "Revize Bekliyor",
};

export const STATUS_BADGE: Record<
  TaskStatus,
  "info" | "warning" | "success" | "danger" | "muted"
> = {
  ASSIGNED: "info",
  IN_PROGRESS: "warning",
  SUBMITTED: "muted",
  APPROVED: "success",
  REVISION_REQUESTED: "danger",
};

export const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Giriş yaptı",
  LOGOUT: "Çıkış yaptı",
  PAGE_VIEW: "Sayfayı görüntüledi",
  CREATE_INTERN: "Stajyer oluşturdu",
  DELETE_INTERN: "Stajyer sildi",
  ASSIGN_TASK: "İş atadı",
  START_TASK: "İşe başladı",
  SUBMIT_TASK: "İş teslim etti",
  APPROVE_TASK: "İşi onayladı",
  REQUEST_REVISION: "Revize istedi",
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Yeni İş",
  TASK_SUBMITTED: "Teslim",
  TASK_APPROVED: "Onay",
  TASK_REVISION: "Revize",
};

export const PAGE_LABELS: Record<string, string> = {
  "/isler": "İşler",
  "/stajyerler": "Stajyerler",
  "/loglar": "Loglar",
  "/ayarlar": "Ayarlar",
};
