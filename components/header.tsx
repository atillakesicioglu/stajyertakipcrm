"use client";

import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { logoutAction } from "@/lib/actions/auth";

export function Header({
  name,
  role,
  onMenuClick,
}: {
  name: string;
  role: "ADMIN" | "INTERN";
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Menü"
      >
        <Menu className="size-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <NotificationBell />
        <div className="mx-2 hidden flex-col items-end leading-tight sm:flex">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">
            {role === "ADMIN" ? "Yönetici" : "Stajyer"}
          </span>
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Çıkış">
            <LogOut className="size-5" />
          </Button>
        </form>
      </div>
    </header>
  );
}
