import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAppSettings } from "@/lib/queries/app-settings";
import { prisma } from "@/lib/prisma";
import { GeneralSettingsCard } from "@/components/settings/general-settings-card";
import { NotificationSettingsCard } from "@/components/settings/notification-settings-card";
import { ThemeColorsCard } from "@/components/settings/theme-colors-card";
import { RolesPermissionsCard } from "@/components/settings/roles-permissions-card";
import { TaskStatusesCard } from "@/components/settings/task-statuses-card";
import { FileUploadLimitsCard } from "@/components/settings/file-upload-limits-card";
import type { RoleKey } from "@/lib/permissions";

export default async function AyarlarPage() {
  const session = await getSession();
  const user = session!.user;

  if (user.role !== "ADMIN") {
    redirect("/isler");
  }

  const [settings, roleGroups] = await Promise.all([
    getAppSettings(),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
  ]);

  const roleCounts: Record<RoleKey, number> = {
    ADMIN: 0,
    INTERN: 0,
  };
  for (const group of roleGroups) {
    roleCounts[group.role as RoleKey] = group._count.role;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">
          Sistem tercihlerinizi yönetin ve CRM&apos;i ihtiyaçlarınıza göre
          özelleştirin
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GeneralSettingsCard settings={settings} />
        <NotificationSettingsCard settings={settings} />
        <ThemeColorsCard settings={settings} initialTheme={user.theme ?? "SYSTEM"} />
        <RolesPermissionsCard roleCounts={roleCounts} />
        <TaskStatusesCard taskStatusConfig={settings.taskStatusConfig} />
        <FileUploadLimitsCard settings={settings} />
      </div>
    </div>
  );
}
