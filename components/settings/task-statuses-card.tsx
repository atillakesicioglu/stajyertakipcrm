"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  updateTaskStatusConfig,
  type SettingsActionState,
} from "@/lib/actions/settings";
import type { TaskStatusConfig, BadgeVariant } from "@/lib/app-settings-defaults";

const initialState: SettingsActionState = { ok: false };

const badgeOptions: { value: BadgeVariant; label: string }[] = [
  { value: "info", label: "Bilgi" },
  { value: "warning", label: "Uyarı" },
  { value: "success", label: "Başarı" },
  { value: "danger", label: "Tehlike" },
  { value: "muted", label: "Nötr" },
];

export function TaskStatusesCard({
  taskStatusConfig,
}: {
  taskStatusConfig: TaskStatusConfig;
}) {
  const [state, formAction, pending] = useActionState(
    updateTaskStatusConfig,
    initialState
  );

  const ordered = (Object.keys(taskStatusConfig) as TaskStatus[])
    .map((status) => ({ status, ...taskStatusConfig[status] }))
    .sort((a, b) => a.order - b.order);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Görev Durumları</CardTitle>
        <CardDescription>İş akışı aşamaları ve etiketleri</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            {ordered.map((item) => (
              <div
                key={item.status}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
              >
                <Badge variant={item.badge} className="shrink-0">
                  {item.label}
                </Badge>
                <input type="hidden" name={`order_${item.status}`} value={item.order} />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    name={`label_${item.status}`}
                    defaultValue={item.label}
                    className="h-8 min-w-[120px] flex-1"
                  />
                  <Select
                    name={`badge_${item.status}`}
                    defaultValue={item.badge}
                    className="h-8 w-28"
                  >
                    {badgeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <span className="text-xs text-muted-foreground">{item.status}</span>
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
            Durumları Kaydet
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
