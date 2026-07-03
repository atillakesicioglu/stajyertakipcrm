import { hexToHsl } from "@/lib/color-utils";

export type BrandColorSettings = {
  primaryColor?: string | null;
  successColor?: string | null;
  warningColor?: string | null;
  dangerColor?: string | null;
  infoColor?: string | null;
  neutralColor?: string | null;
};

const BRAND_VAR_MAP: {
  key: keyof BrandColorSettings;
  vars: string[];
}[] = [
  { key: "primaryColor", vars: ["--primary"] },
  { key: "successColor", vars: ["--brand-success"] },
  { key: "warningColor", vars: ["--brand-warning"] },
  { key: "dangerColor", vars: ["--brand-danger", "--destructive"] },
  { key: "infoColor", vars: ["--brand-info"] },
  { key: "neutralColor", vars: ["--brand-neutral"] },
];

/** Marka renklerini doğrudan document root'a uygular. */
export function applyBrandColors(settings: BrandColorSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  for (const { key, vars } of BRAND_VAR_MAP) {
    const hex = settings[key];
    if (!hex) continue;
    const hsl = hexToHsl(hex);
    for (const cssVar of vars) {
      root.style.setProperty(cssVar, hsl);
    }
  }
}
