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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  updateNotificationSettings,
  updateUserNotificationSettings,
  type SettingsActionState,
} from "@/lib/actions/settings";
import type { NotificationPrefs } from "@/lib/notification-prefs";
import {
  ADMIN_NOTIFICATION_ITEMS,
  INTERN_NOTIFICATION_ITEMS,
} from "@/lib/notification-prefs";

const initialState: SettingsActionState = { ok: false };

export function NotificationSettingsCard({
  prefs,
  isAdmin,
}: {
  prefs: NotificationPrefs;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    isAdmin ? updateNotificationSettings : updateUserNotificationSettings,
    initialState
  );
  const [values, setValues] = useState(prefs);

  const items = isAdmin ? ADMIN_NOTIFICATION_ITEMS : INTERN_NOTIFICATION_ITEMS;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Bildirimler</CardTitle>
        <CardDescription>
          {isAdmin
            ? "E-posta ve panel bildirim tercihleri"
            : "Hangi bildirimleri almak istediğinizi seçin"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
              >
                <Label htmlFor={item.key} className="text-sm font-normal">
                  {item.label}
                </Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id={item.key}
                    checked={values[item.key]}
                    onCheckedChange={(checked) =>
                      setValues((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                  {values[item.key] && (
                    <input type="hidden" name={item.key} value="on" />
                  )}
                </div>
              </div>
            ))}
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
