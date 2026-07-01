"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import type { Theme } from "@prisma/client";
import { DB_THEME_TO_NEXT } from "@/lib/theme";

/** Oturum açıkken DB'deki tema tercihini next-themes'e uygular. */
export function ThemeSync({ theme }: { theme: Theme }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(DB_THEME_TO_NEXT[theme]);
  }, [theme, setTheme]);

  return null;
}
