"use client";

import { useEffect } from "react";
import { applyBrandColors } from "@/lib/apply-brand-theme";

export function BrandTheme({
  settings,
}: {
  settings: {
    primaryColor: string | null;
    successColor: string | null;
    warningColor: string | null;
    dangerColor: string | null;
    infoColor: string | null;
    neutralColor: string | null;
  };
}) {
  useEffect(() => {
    applyBrandColors(settings);
  }, [
    settings.primaryColor,
    settings.successColor,
    settings.warningColor,
    settings.dangerColor,
    settings.infoColor,
    settings.neutralColor,
  ]);

  return null;
}
