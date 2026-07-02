"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import type { Theme } from "@prisma/client";
import { cn } from "@/lib/utils";
import { updateTheme } from "@/lib/actions/settings";
import { DB_THEME_TO_NEXT } from "@/lib/theme";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "LIGHT", label: "Aydınlık", icon: Sun },
  { value: "DARK", label: "Karanlık", icon: Moon },
  { value: "SYSTEM", label: "Sistem", icon: Monitor },
];

export function ThemeSettings({ initialTheme }: { initialTheme: Theme }) {
  const { setTheme } = useTheme();
  const { update } = useSession();
  const [selected, setSelected] = useState<Theme>(initialTheme);
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  function choose(theme: Theme) {
    setSelected(theme);
    setTheme(DB_THEME_TO_NEXT[theme]);
    startTransition(async () => {
      await update({ theme });
      await updateTheme(theme);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mounted && selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => choose(opt.value)}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-lg border p-6 transition-colors hover:bg-accent",
              active && "border-primary ring-2 ring-primary/30"
            )}
          >
            {active && (
              <Check className="absolute right-3 top-3 size-4 text-primary" />
            )}
            <Icon className="size-7" />
            <span className="text-sm font-medium">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
