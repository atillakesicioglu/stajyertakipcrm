export type PermissionModule =
  | "tasks"
  | "interns"
  | "reports"
  | "settings"
  | "logs"
  | "officeTasks";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve";

export type RoleKey = "ADMIN" | "INTERN";

export const PERMISSION_MODULES: {
  key: PermissionModule;
  label: string;
}[] = [
  { key: "tasks", label: "Görevler" },
  { key: "interns", label: "Stajyerler" },
  { key: "reports", label: "Raporlar" },
  { key: "settings", label: "Ayarlar" },
  { key: "logs", label: "Loglar" },
  { key: "officeTasks", label: "Ofis İşleri" },
];

export const PERMISSION_ACTIONS: {
  key: PermissionAction;
  label: string;
}[] = [
  { key: "view", label: "Görüntüle" },
  { key: "create", label: "Oluştur" },
  { key: "edit", label: "Düzenle" },
  { key: "delete", label: "Sil" },
  { key: "approve", label: "Onayla" },
];

/** Mevcut kod tabanındaki gerçek izinler */
export const ROLE_PERMISSIONS: Record<
  RoleKey,
  Record<PermissionModule, PermissionAction[]>
> = {
  ADMIN: {
    tasks: ["view", "create", "edit", "delete", "approve"],
    interns: ["view", "create", "edit", "delete"],
    reports: ["view", "create", "edit", "delete"],
    settings: ["view", "edit"],
    logs: ["view"],
    officeTasks: ["view", "create", "edit", "delete"],
  },
  INTERN: {
    tasks: ["view", "edit"],
    interns: [],
    reports: ["view", "create", "edit"],
    settings: [],
    logs: [],
    officeTasks: ["view", "edit"],
  },
};

export const ROLE_LABELS: Record<RoleKey, string> = {
  ADMIN: "Yönetici",
  INTERN: "Stajyer",
};

export const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  ADMIN: "Tüm modüllere tam erişim",
  INTERN: "Kendi işleri ve raporları",
};

export function roleHasPermission(
  role: RoleKey,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  return ROLE_PERMISSIONS[role][module].includes(action);
}
