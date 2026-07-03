"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ActivityTracker } from "@/components/activity-tracker";
import { cn } from "@/lib/utils";

export function DashboardShell({
  name,
  role,
  companyName = "Stajyer Takip",
  children,
}: {
  name: string;
  role: "ADMIN" | "INTERN";
  companyName?: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <ActivityTracker />

      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar role={role} companyName={companyName} />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className={cn(
              "absolute left-0 top-0 h-full w-64 border-r bg-card shadow-xl"
            )}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 text-muted-foreground"
              aria-label="Kapat"
            >
              <X className="size-5" />
            </button>
            <Sidebar
              role={role}
              companyName={companyName}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          name={name}
          role={role}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
