import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      name={session.user.name ?? "Kullanıcı"}
      role={session.user.role}
    >
      {children}
    </DashboardShell>
  );
}
