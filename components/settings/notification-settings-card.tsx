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
  type SettingsActionState,
} from "@/lib/actions/settings";
import type { AppSettingsData } from "@/lib/queries/app-settings";

const initialState: SettingsActionState = { ok: false };

const items: {
  key: keyof Pick<
    AppSettingsData,
    | "notifyTaskAssigned"
    | "notifyTaskSubmitted"
    | "notifyTaskApproved"
    | "notifyTaskRevision"
    | "notifyDeadline"
    | "notifyComment"
    | "notifyDailySummary"
  >;
  label: string;
}[] = [
  { key: "notifyTaskAssigned", label: "Yeni iş atandığında" },
  { key: "notifyTaskSubmitted", label: "İş teslim edildiğinde" },
  { key: "notifyTaskApproved", label: "İş onaylandığında" },
  { key: "notifyTaskRevision", label: "Revize istendiğinde" },
  { key: "notifyDeadline", label: "Son teslim tarihi yaklaşınca" },
  { key: "notifyComment", label: "Yorum eklendiğinde" },
  { key: "notifyDailySummary", label: "Günlük özet bildirimi" },
];

export function NotificationSettingsCard({
  settings,
}: {
  settings: AppSettingsData;
}) {
  const [state, formAction, pending] = useActionState(
    updateNotificationSettings,
    initialState
  );
  const [values, setValues] = useState({
    notifyTaskAssigned: settings.notifyTaskAssigned,
    notifyTaskSubmitted: settings.notifyTaskSubmitted,
    notifyTaskApproved: settings.notifyTaskApproved,
    notifyTaskRevision: settings.notifyTaskRevision,
    notifyDeadline: settings.notifyDeadline,
    notifyComment: settings.notifyComment,
    notifyDailySummary: settings.notifyDailySummary,
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Bildirimler</CardTitle>
        <CardDescription>E-posta ve panel bildirim tercihleri</CardDescription>
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
