"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateTheme } from "@/lib/actions/settings";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    startTransition(() => {
      updateTheme(next === "dark" ? "DARK" : "LIGHT");
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
