"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { Theme } from "@prisma/client";
import { DB_THEME_TO_NEXT } from "@/lib/theme";

/** Oturum açılışında DB/JWT temasını next-themes'e bir kez uygular. */
export function ThemeSync({ theme }: { theme: Theme }) {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    setTheme(DB_THEME_TO_NEXT[theme]);
  }, [theme, setTheme]);

  return null;
}
