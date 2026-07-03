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
  RESET_INTERN_PASSWORD: "Stajyer şifresini sıfırladı",
  SET_PASSWORD: "Şifre belirledi",
  ASSIGN_TASK: "İş atadı",
  START_TASK: "İşe başladı",
  SUBMIT_TASK: "İş teslim etti",
  APPROVE_TASK: "İşi onayladı",
  REQUEST_REVISION: "Revize istedi",
  CREATE_REPORT: "Günlük rapor yazdı",
  CREATE_OFFICE_TASK: "Ofis işi ekledi",
  DELETE_OFFICE_TASK: "Ofis işi sildi",
  ASSIGN_OFFICE_TASK: "Ofis görevi atadı",
  UNASSIGN_OFFICE_TASK: "Ofis görevi kaldırdı",
  COMPLETE_OFFICE_TASK: "Ofis işini tamamladı",
  UNCOMPLETE_OFFICE_TASK: "Ofis işi onayını geri aldı",
};

export type ActionCategory =
  | "oturum"
  | "gezinti"
  | "gorev"
  | "stajyer"
  | "ofis"
  | "rapor";

export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  oturum: "Oturum",
  gezinti: "Gezinti",
  gorev: "Görevler",
  stajyer: "Stajyerler",
  ofis: "Ofis İşleri",
  rapor: "Raporlar",
};

export type ActionBadgeVariant =
  | "success"
  | "muted"
  | "info"
  | "warning"
  | "danger"
  | "secondary";

export type ActionConfig = {
  label: string;
  category: ActionCategory;
  variant: ActionBadgeVariant;
};

export const ACTION_CONFIG: Record<string, ActionConfig> = {
  LOGIN: { label: "Giriş yaptı", category: "oturum", variant: "success" },
  LOGOUT: { label: "Çıkış yaptı", category: "oturum", variant: "muted" },
  SET_PASSWORD: { label: "Şifre belirledi", category: "oturum", variant: "info" },
  PAGE_VIEW: { label: "Sayfayı görüntüledi", category: "gezinti", variant: "secondary" },
  ASSIGN_TASK: { label: "İş atadı", category: "gorev", variant: "info" },
  START_TASK: { label: "İşe başladı", category: "gorev", variant: "warning" },
  SUBMIT_TASK: { label: "İş teslim etti", category: "gorev", variant: "info" },
  APPROVE_TASK: { label: "İşi onayladı", category: "gorev", variant: "success" },
  REQUEST_REVISION: { label: "Revize istedi", category: "gorev", variant: "danger" },
  CREATE_INTERN: { label: "Stajyer oluşturdu", category: "stajyer", variant: "success" },
  DELETE_INTERN: { label: "Stajyer sildi", category: "stajyer", variant: "danger" },
  RESET_INTERN_PASSWORD: {
    label: "Stajyer şifresini sıfırladı",
    category: "stajyer",
    variant: "warning",
  },
  CREATE_REPORT: { label: "Günlük rapor yazdı", category: "rapor", variant: "success" },
  CREATE_OFFICE_TASK: { label: "Ofis işi ekledi", category: "ofis", variant: "info" },
  DELETE_OFFICE_TASK: { label: "Ofis işi sildi", category: "ofis", variant: "danger" },
  ASSIGN_OFFICE_TASK: { label: "Ofis görevi atadı", category: "ofis", variant: "info" },
  UNASSIGN_OFFICE_TASK: {
    label: "Ofis görevi kaldırdı",
    category: "ofis",
    variant: "warning",
  },
  COMPLETE_OFFICE_TASK: {
    label: "Ofis işini tamamladı",
    category: "ofis",
    variant: "success",
  },
  UNCOMPLETE_OFFICE_TASK: {
    label: "Ofis işi onayını geri aldı",
    category: "ofis",
    variant: "muted",
  },
};

export function getActionConfig(action: string): ActionConfig {
  return (
    ACTION_CONFIG[action] ?? {
      label: ACTION_LABELS[action] ?? action,
      category: "gezinti",
      variant: "muted",
    }
  );
}

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Yeni İş",
  TASK_SUBMITTED: "Teslim",
  TASK_APPROVED: "Onay",
  TASK_REVISION: "Revize",
};

export const PAGE_LABELS: Record<string, string> = {
  "/isler": "Dashboard",
  "/gorevler": "Görevler",
  "/ofis-isleri": "Ofis İşleri",
  "/stajyerler": "Stajyerler",
  "/loglar": "Loglar",
  "/ayarlar": "Ayarlar",
  "/gunluk-notlar": "Günlük Notlar",
  "/raporlar": "Raporlar",
};
