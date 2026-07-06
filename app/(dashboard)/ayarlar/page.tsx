import { getSession } from "@/lib/session";
import { getAppSettings } from "@/lib/queries/app-settings";
import { prisma } from "@/lib/prisma";
import { GeneralSettingsCard } from "@/components/settings/general-settings-card";
import { NotificationSettingsCard } from "@/components/settings/notification-settings-card";
import { EmailNotificationsCard } from "@/components/settings/email-notifications-card";
import { ThemeColorsCard } from "@/components/settings/theme-colors-card";
import { RolesPermissionsCard } from "@/components/settings/roles-permissions-card";
import { TaskStatusesCard } from "@/components/settings/task-statuses-card";
import { FileUploadLimitsCard } from "@/components/settings/file-upload-limits-card";
import { CreateAdminCard } from "@/components/settings/create-admin-card";
import type { RoleKey } from "@/lib/permissions";
import type { NotificationPrefs } from "@/lib/notification-prefs";

function settingsToNotificationPrefs(settings: {
  notifyTaskAssigned: boolean;
  notifyTaskSubmitted: boolean;
  notifyTaskApproved: boolean;
  notifyTaskRevision: boolean;
  notifyDeadline: boolean;
  notifyComment: boolean;
  notifyDailySummary: boolean;
}): NotificationPrefs {
  return {
    notifyTaskAssigned: settings.notifyTaskAssigned,
    notifyTaskSubmitted: settings.notifyTaskSubmitted,
    notifyTaskApproved: settings.notifyTaskApproved,
    notifyTaskRevision: settings.notifyTaskRevision,
    notifyDeadline: settings.notifyDeadline,
    notifyComment: settings.notifyComment,
    notifyDailySummary: settings.notifyDailySummary,
  };
}

export default async function AyarlarPage() {
  const session = await getSession();
  const user = session!.user;
  const isAdmin = user.role === "ADMIN";

  const settings = await getAppSettings();

  const emailPrefs = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      notificationEmail: true,
      notificationEmailVerifiedAt: true,
      emailNotificationsEnabled: true,
    },
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
          <p className="text-sm text-muted-foreground">
            Tema ve bildirim tercihlerinizi yönetin
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ThemeColorsCard
            settings={settings}
            initialTheme={user.theme ?? "SYSTEM"}
            isAdmin={false}
          />
          {emailPrefs && <EmailNotificationsCard user={emailPrefs} />}
        </div>
      </div>
    );
  }

  const roleGroups = await prisma.user.groupBy({
    by: ["role"],
    _count: { role: true },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      lastLoginAt: true,
    },
  });

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
        <NotificationSettingsCard
          prefs={settingsToNotificationPrefs(settings)}
          isAdmin
        />
        {emailPrefs && <EmailNotificationsCard user={emailPrefs} />}
        <ThemeColorsCard
          settings={settings}
          initialTheme={user.theme ?? "SYSTEM"}
          isAdmin
        />
        <RolesPermissionsCard roleCounts={roleCounts} />
        <CreateAdminCard admins={admins} />
        <TaskStatusesCard taskStatusConfig={settings.taskStatusConfig} />
        <FileUploadLimitsCard settings={settings} />
      </div>
    </div>
  );
}
