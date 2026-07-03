export type NotificationPrefs = {
  notifyTaskAssigned: boolean;
  notifyTaskSubmitted: boolean;
  notifyTaskApproved: boolean;
  notifyTaskRevision: boolean;
  notifyDeadline: boolean;
  notifyComment: boolean;
  notifyDailySummary: boolean;
};

export const NOTIFICATION_PREF_KEYS = [
  "notifyTaskAssigned",
  "notifyTaskSubmitted",
  "notifyTaskApproved",
  "notifyTaskRevision",
  "notifyDeadline",
  "notifyComment",
  "notifyDailySummary",
] as const satisfies readonly (keyof NotificationPrefs)[];

export const INTERN_NOTIFICATION_ITEMS: {
  key: keyof NotificationPrefs;
  label: string;
}[] = [
  { key: "notifyTaskAssigned", label: "Yeni iş atandığında" },
  { key: "notifyTaskApproved", label: "İş onaylandığında" },
  { key: "notifyTaskRevision", label: "Revize istendiğinde" },
  { key: "notifyDeadline", label: "Son teslim tarihi yaklaşınca" },
  { key: "notifyDailySummary", label: "Günlük özet bildirimi" },
];

export const ADMIN_NOTIFICATION_ITEMS: {
  key: keyof NotificationPrefs;
  label: string;
}[] = [
  { key: "notifyTaskAssigned", label: "Yeni iş atandığında" },
  { key: "notifyTaskSubmitted", label: "İş teslim edildiğinde" },
  { key: "notifyTaskApproved", label: "İş onaylandığında" },
  { key: "notifyTaskRevision", label: "Revize istendiğinde" },
  { key: "notifyDeadline", label: "Son teslim tarihi yaklaşınca" },
  { key: "notifyComment", label: "Yorum eklendiğinde" },
  { key: "notifyDailySummary", label: "Günlük özet bildirimi" },
];

export function parseNotificationPrefsFromForm(
  formData: FormData
): NotificationPrefs {
  return {
    notifyTaskAssigned: formData.get("notifyTaskAssigned") === "on",
    notifyTaskSubmitted: formData.get("notifyTaskSubmitted") === "on",
    notifyTaskApproved: formData.get("notifyTaskApproved") === "on",
    notifyTaskRevision: formData.get("notifyTaskRevision") === "on",
    notifyDeadline: formData.get("notifyDeadline") === "on",
    notifyComment: formData.get("notifyComment") === "on",
    notifyDailySummary: formData.get("notifyDailySummary") === "on",
  };
}
