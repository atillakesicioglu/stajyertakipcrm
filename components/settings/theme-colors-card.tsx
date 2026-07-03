"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Theme } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ThemeSettings } from "@/components/theme-settings";
import {
  updateThemeColors,
  type SettingsActionState,
} from "@/lib/actions/settings";
import type { AppSettingsData } from "@/lib/queries/app-settings";
import { normalizeHex } from "@/lib/color-utils";
import {
  applyBrandColors,
  type BrandColorSettings,
} from "@/lib/apply-brand-theme";

const initialState: SettingsActionState = { ok: false };

type ColorKey =
  | "primaryColor"
  | "successColor"
  | "warningColor"
  | "dangerColor"
  | "infoColor"
  | "neutralColor";

const colorFields: {
  key: ColorKey;
  label: string;
  fallback: string;
}[] = [
  { key: "primaryColor", label: "Birincil", fallback: "#1e3a5f" },
  { key: "successColor", label: "Başarı", fallback: "#22c55e" },
  { key: "warningColor", label: "Uyarı", fallback: "#f59e0b" },
  { key: "dangerColor", label: "Tehlike", fallback: "#ef4444" },
  { key: "infoColor", label: "Bilgi", fallback: "#3b82f6" },
  { key: "neutralColor", label: "Nötr", fallback: "#6b7280" },
];

type ColorMap = Record<ColorKey, string>;

function buildColorMap(settings: AppSettingsData): ColorMap {
  return Object.fromEntries(
    colorFields.map((f) => [f.key, settings[f.key] ?? f.fallback])
  ) as ColorMap;
}

function toBrandSettings(map: ColorMap): BrandColorSettings {
  const result: BrandColorSettings = {};
  for (const field of colorFields) {
    const normalized = normalizeHex(map[field.key]);
    if (normalized) result[field.key] = normalized;
  }
  return result;
}

function ColorPreview({ colors }: { colors: ColorMap }) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Görünüm Önizlemesi
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="h-8 min-w-[80px] flex-1 rounded-md"
          style={{ backgroundColor: colors.primaryColor }}
        />
        <div
          className="rounded-md px-3 py-1.5 text-xs text-white"
          style={{ backgroundColor: colors.successColor }}
        >
          Başarı
        </div>
        <div
          className="rounded-md px-3 py-1.5 text-xs text-white"
          style={{ backgroundColor: colors.warningColor }}
        >
          Uyarı
        </div>
        <div
          className="rounded-md px-3 py-1.5 text-xs text-white"
          style={{ backgroundColor: colors.dangerColor }}
        >
          Tehlike
        </div>
        <div
          className="rounded-md px-3 py-1.5 text-xs text-white"
          style={{ backgroundColor: colors.infoColor }}
        >
          Bilgi
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Badge variant="danger">Tehlike rozeti</Badge>
        <Badge variant="success">Başarı rozeti</Badge>
        <Button type="button" variant="destructive" size="sm">
          Sil butonu
        </Button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  name: ColorKey;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <div
            className="size-10 shrink-0 rounded-md border"
            style={{ backgroundColor: value }}
          />
          <Input readOnly value={value} className="font-mono text-xs" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${name}-picker`}>{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="size-10 shrink-0 rounded-md border"
          style={{ backgroundColor: value }}
        />
        <Input
          id={`${name}-picker`}
          type="color"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-10 w-14 cursor-pointer p-1"
        />
        <Input
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(next)) onChange?.(next);
          }}
          onBlur={(e) => {
            const normalized = normalizeHex(e.target.value);
            if (normalized) onChange?.(normalized);
          }}
          className="font-mono text-xs"
          placeholder="#rrggbb"
        />
        <input type="hidden" name={name} value={value} />
      </div>
    </div>
  );
}

function ColorSwatches({
  colors,
  onChange,
  readOnly,
}: {
  colors: ColorMap;
  onChange?: (key: ColorKey, value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {colorFields.map((field) => (
        <ColorField
          key={field.key}
          name={field.key}
          label={field.label}
          value={colors[field.key]}
          readOnly={readOnly}
          onChange={
            onChange ? (value) => onChange(field.key, value) : undefined
          }
        />
      ))}
    </div>
  );
}

export function ThemeColorsCard({
  settings,
  initialTheme,
  isAdmin,
}: {
  settings: AppSettingsData;
  initialTheme: Theme;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [colors, setColors] = useState<ColorMap>(() => buildColorMap(settings));
  const wasPending = useRef(false);
  const [state, formAction, pending] = useActionState(
    updateThemeColors,
    initialState
  );

  useEffect(() => {
    const next = buildColorMap(settings);
    setColors(next);
    applyBrandColors(toBrandSettings(next));
  }, [settings]);

  useEffect(() => {
    if (wasPending.current && !pending && state.ok) {
      applyBrandColors(toBrandSettings(colors));
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, state.ok, colors, router]);

  function handleColorChange(key: ColorKey, value: string) {
    setColors((prev) => {
      const next = { ...prev, [key]: value };
      const normalized = normalizeHex(value);
      if (normalized) {
        applyBrandColors({ ...toBrandSettings(prev), [key]: normalized });
      }
      return next;
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tema Renkleri</CardTitle>
        <CardDescription>
          {isAdmin
            ? "Panel görünümü ve marka renkleri"
            : "Panel görünümü ve sistem renkleri"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-3 block">Görünüm Modu</Label>
          <ThemeSettings initialTheme={initialTheme} />
        </div>

        {isAdmin ? (
          <form action={formAction} className="space-y-4">
            <ColorSwatches colors={colors} onChange={handleColorChange} />
            <p className="text-xs text-muted-foreground">
              <strong>Tehlike</strong> rengi kırmızı rozetleri ve sil
              butonlarını değiştirir. <strong>Birincil</strong> renk menü ve
              ana butonları etkiler.
            </p>
            <ColorPreview colors={colors} />
            {state.message && (
              <p
                className={
                  state.ok
                    ? "text-sm text-green-600"
                    : "text-sm text-destructive"
                }
              >
                {state.message}
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Loader2 className="animate-spin" />}
              Renkleri Kaydet
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Renk Paleti</Label>
              <ColorSwatches colors={colors} readOnly />
            </div>
            <ColorPreview colors={colors} />
            <p className="text-xs text-muted-foreground">
              Marka renkleri yönetici tarafından belirlenir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
