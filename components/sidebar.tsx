"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Users,
  ScrollText,
  Settings,
  GraduationCap,
  FileText,
  Building2,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "INTERN";

const navItems = [
  { href: "/isler", label: "İşler", icon: Briefcase, roles: ["ADMIN", "INTERN"] },
  {
    href: "/ofis-isleri",
    label: "Ofis İşleri",
    icon: Building2,
    roles: ["ADMIN", "INTERN"],
  },
  { href: "/stajyerler", label: "Stajyerler", icon: Users, roles: ["ADMIN", "INTERN"] },
  { href: "/loglar", label: "Loglar", icon: ScrollText, roles: ["ADMIN"] },
  {
    href: "/gunluk-notlar",
    label: "Günlük Notlar",
    icon: NotebookPen,
    roles: ["ADMIN", "INTERN"],
  },
  { href: "/raporlar", label: "Raporlar", icon: FileText, roles: ["ADMIN"] },
  {
    href: "/ayarlar",
    label: "Ayarlar",
    icon: Settings,
    roles: ["ADMIN", "INTERN"],
  },
] as const;

export function Sidebar({
  role,
  companyName = "Stajyer Takip",
  onNavigate,
}: {
  role: Role;
  companyName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navItems.filter((item) =>
    (item.roles as readonly Role[]).includes(role)
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{companyName}</span>
          <span className="text-xs text-muted-foreground">CRM Panel</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        {role === "ADMIN" ? "Yönetici Paneli" : "Stajyer Paneli"}
      </div>
    </div>
  );
}
