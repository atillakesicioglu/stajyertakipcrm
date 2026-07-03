"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  updateFileUploadSettings,
  type SettingsActionState,
} from "@/lib/actions/settings";
import type { AppSettingsData } from "@/lib/queries/app-settings";

const initialState: SettingsActionState = { ok: false };

const fileTypeOptions = [
  { value: "image/png", label: "PNG" },
  { value: "image/jpeg", label: "JPG" },
  { value: "image/webp", label: "WEBP" },
  { value: "application/pdf", label: "PDF" },
];

export function FileUploadLimitsCard({
  settings,
}: {
  settings: AppSettingsData;
}) {
  const [state, formAction, pending] = useActionState(
    updateFileUploadSettings,
    initialState
  );
  const [virusScan, setVirusScan] = useState(settings.virusScanEnabled);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    settings.allowedFileTypes
  );

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dosya Yükleme Limitleri</CardTitle>
        <CardDescription>Ekran görüntüsü ve dosya kuralları</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxFileSizeMb">Maks. Dosya Boyutu (MB)</Label>
              <Input
                id="maxFileSizeMb"
                name="maxFileSizeMb"
                type="number"
                min={1}
                max={50}
                defaultValue={settings.maxFileSizeMb}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStorageMb">Toplam Depolama (MB)</Label>
              <Input
                id="maxStorageMb"
                name="maxStorageMb"
                type="number"
                min={10}
                max={10000}
                defaultValue={settings.maxStorageMb}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>İzin Verilen Dosya Tipleri</Label>
            <div className="flex flex-wrap gap-2">
              {fileTypeOptions.map((opt) => {
                const active = selectedTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleType(opt.value)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <input
              type="hidden"
              name="allowedFileTypes"
              value={selectedTypes.join(",")}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <Label htmlFor="virusScanEnabled">Dosya Virüs Taraması</Label>
              <p className="text-xs text-muted-foreground">
                Harici servis entegrasyonu gerektirir
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="virusScanEnabled"
                checked={virusScan}
                onCheckedChange={setVirusScan}
              />
              {virusScan && (
                <input type="hidden" name="virusScanEnabled" value="on" />
              )}
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
            Kaydet
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
