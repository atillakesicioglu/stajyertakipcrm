"use client";

import { useActionState } from "react";
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
import { ThemeSettings } from "@/components/theme-settings";
import {
  updateThemeColors,
  type SettingsActionState,
} from "@/lib/actions/settings";
import type { AppSettingsData } from "@/lib/queries/app-settings";

const initialState: SettingsActionState = { ok: false };

const colorFields: {
  key: keyof Pick<
    AppSettingsData,
    | "primaryColor"
    | "successColor"
    | "warningColor"
    | "dangerColor"
    | "infoColor"
    | "neutralColor"
  >;
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

export function ThemeColorsCard({
  settings,
  initialTheme,
  isAdmin,
}: {
  settings: AppSettingsData;
  initialTheme: Theme;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateThemeColors,
    initialState
  );

  const previewPrimary = settings.primaryColor ?? "#1e3a5f";

  if (!isAdmin) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>
            Panel görünümünü aydınlık veya karanlık olarak ayarlayın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSettings initialTheme={initialTheme} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tema Renkleri</CardTitle>
        <CardDescription>Panel görünümü ve marka renkleri</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-3 block">Görünüm Modu</Label>
          <ThemeSettings initialTheme={initialTheme} />
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {colorFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={field.key}
                    name={field.key}
                    type="color"
                    defaultValue={settings[field.key] ?? field.fallback}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    defaultValue={settings[field.key] ?? field.fallback}
                    readOnly
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Görünüm Önizlemesi
            </p>
            <div className="flex items-center gap-2">
              <div
                className="h-8 flex-1 rounded-md"
                style={{ backgroundColor: previewPrimary }}
              />
              <div className="rounded-md bg-muted px-3 py-1.5 text-xs">Kart</div>
              <div
                className="rounded-md px-3 py-1.5 text-xs text-white"
                style={{ backgroundColor: settings.successColor ?? "#22c55e" }}
              >
                Onay
              </div>
            </div>
          </div>

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
      </CardContent>
    </Card>
  );
}
