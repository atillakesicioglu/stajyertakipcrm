"use client";

import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateTheme } from "@/lib/actions/settings";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { update } = useSession();
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    const dbTheme = next === "dark" ? "DARK" : "LIGHT";
    setTheme(next);
    startTransition(async () => {
      await update({ theme: dbTheme });
      await updateTheme(dbTheme);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Tema değiştir"
      onClick={toggle}
    >
      {mounted && isDark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  );
}
