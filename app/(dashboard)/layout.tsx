import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { ThemeSync } from "@/components/theme-sync";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <ThemeSync theme={session.user.theme ?? "SYSTEM"} />
      <DashboardShell
        name={session.user.name ?? "Kullanıcı"}
        role={session.user.role}
      >
        {children}
      </DashboardShell>
    </>
  );
}
