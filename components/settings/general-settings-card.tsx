"use client";

import { useActionState } from "react";
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
import { Select } from "@/components/ui/select";
import {
  updateGeneralSettings,
  type SettingsActionState,
} from "@/lib/actions/settings";
import type { AppSettingsData } from "@/lib/queries/app-settings";

const initialState: SettingsActionState = { ok: false };

export function GeneralSettingsCard({ settings }: { settings: AppSettingsData }) {
  const [state, formAction, pending] = useActionState(
    updateGeneralSettings,
    initialState
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Genel Ayarlar</CardTitle>
        <CardDescription>Şirket ve sistem tercihleri</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Şirket Adı</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={settings.companyName}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Dil</Label>
              <Select id="language" name="language" defaultValue={settings.language}>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Saat Dilimi</Label>
              <Select id="timezone" name="timezone" defaultValue={settings.timezone}>
                <option value="Europe/Istanbul">İstanbul (UTC+3)</option>
                <option value="Europe/London">Londra (UTC+0)</option>
                <option value="America/New_York">New York (UTC-5)</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Tarih Formatı</Label>
              <Select
                id="dateFormat"
                name="dateFormat"
                defaultValue={settings.dateFormat}
              >
                <option value="d MMMM yyyy">3 Temmuz 2026</option>
                <option value="dd.MM.yyyy">03.07.2026</option>
                <option value="yyyy-MM-dd">2026-07-03</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekStartDay">Haftanın İlk Günü</Label>
              <Select
                id="weekStartDay"
                name="weekStartDay"
                defaultValue={String(settings.weekStartDay)}
              >
                <option value="1">Pazartesi</option>
                <option value="0">Pazar</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Para Birimi</Label>
              <Select id="currency" name="currency" defaultValue={settings.currency}>
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminderTime">Günlük Hatırlatma</Label>
              <Input
                id="reminderTime"
                name="reminderTime"
                type="time"
                defaultValue={settings.reminderTime}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="autoLogoutMinutes">Otomatik Çıkış (dk)</Label>
            <Input
              id="autoLogoutMinutes"
              name="autoLogoutMinutes"
              type="number"
              min={5}
              max={480}
              defaultValue={settings.autoLogoutMinutes}
              required
            />
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
            Değişiklikleri Kaydet
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
