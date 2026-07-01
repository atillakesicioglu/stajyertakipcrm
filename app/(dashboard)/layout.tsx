import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { ThemeSync } from "@/components/theme-sync";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { theme: true },
  });

  return (
    <>
      <ThemeSync theme={user?.theme ?? "SYSTEM"} />
      <DashboardShell
        name={session.user.name ?? "Kullanıcı"}
        role={session.user.role}
      >
        {children}
      </DashboardShell>
    </>
  );
}
