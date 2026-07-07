import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAppSettings } from "@/lib/queries/app-settings";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardDataProvider } from "@/components/dashboard-data-provider";
import { ThemeSync } from "@/components/theme-sync";
import { BrandTheme } from "@/components/brand-theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const settings = await getAppSettings();

  return (
    <>
      <ThemeSync theme={session.user.theme ?? "SYSTEM"} />
      <BrandTheme settings={settings} />
      <DashboardDataProvider>
        <DashboardShell
          name={session.user.name ?? "Kullanıcı"}
          role={session.user.role}
          companyName={settings.companyName}
        >
          {children}
        </DashboardShell>
      </DashboardDataProvider>
    </>
  );
}
