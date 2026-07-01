import type { Theme } from "@prisma/client";

export const DB_THEME_TO_NEXT: Record<Theme, string> = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
};

export function nextThemeToDb(theme: string): Theme {
  if (theme === "dark") return "DARK";
  if (theme === "light") return "LIGHT";
  return "SYSTEM";
}
