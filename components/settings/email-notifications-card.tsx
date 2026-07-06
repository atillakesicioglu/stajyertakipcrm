"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, Mail } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  sendVerificationEmailAction,
  toggleEmailNotificationsAction,
  type EmailNotificationActionState,
} from "@/lib/actions/email-notifications";

const initialState: EmailNotificationActionState = { ok: false };

export type EmailNotificationUserState = {
  notificationEmail: string | null;
  notificationEmailVerifiedAt: Date | null;
  emailNotificationsEnabled: boolean;
};

function getStatusBadge(user: EmailNotificationUserState) {
  if (!user.notificationEmail) {
    return { label: "E-posta eklenmemiş", variant: "muted" as const };
  }
  if (!user.notificationEmailVerifiedAt) {
    return { label: "Doğrulama bekleniyor", variant: "warning" as const };
  }
  if (!user.emailNotificationsEnabled) {
    return { label: "Bildirimler kapalı", variant: "secondary" as const };
  }
  return { label: "Doğrulanmış", variant: "success" as const };
}

export function EmailNotificationsCard({
  user,
}: {
  user: EmailNotificationUserState;
}) {
  const [sendState, sendAction, sendPending] = useActionState(
    sendVerificationEmailAction,
    initialState
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleEmailNotificationsAction,
    initialState
  );
  const toggleFormRef = useRef<HTMLFormElement>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user.emailNotificationsEnabled
  );

  const status = getStatusBadge(user);
  const isVerified = !!user.notificationEmailVerifiedAt;
  const emailValue = user.notificationEmail ?? "";

  function handleToggle(checked: boolean) {
    if (!isVerified || togglePending) return;
    setNotificationsEnabled(checked);
    const form = toggleFormRef.current;
    if (!form) return;
    const input = form.querySelector(
      'input[name="enabled"]'
    ) as HTMLInputElement | null;
    if (input) input.value = String(checked);
    form.requestSubmit();
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          E-posta Bildirimleri
        </CardTitle>
        <CardDescription>
          E-posta adresinizi doğruladıktan sonra görev, ofis işi ve önemli
          gelişmeler hakkında mail bildirimi alabilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Durum</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <form action={sendAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="notificationEmail">Bildirim e-postası</Label>
            <Input
              id="notificationEmail"
              name="notificationEmail"
              type="email"
              placeholder="ornek@email.com"
              defaultValue={emailValue}
              required
            />
          </div>
          {sendState.message && (
            <p
              className={
                sendState.ok
                  ? "text-sm text-green-600"
                  : "text-sm text-destructive"
              }
            >
              {sendState.message}
            </p>
          )}
          <Button type="submit" disabled={sendPending} className="w-full">
            {sendPending && <Loader2 className="animate-spin" />}
            Doğrulama maili gönder
          </Button>
        </form>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications-toggle">
                Mail bildirimleri
              </Label>
              <p className="text-xs text-muted-foreground">
                {isVerified
                  ? "Doğrulanmış e-postanıza bildirim gönderilir."
                  : "Önce e-postanızı doğrulamanız gerekir."}
              </p>
            </div>
            <Switch
              id="email-notifications-toggle"
              checked={notificationsEnabled}
              disabled={!isVerified || togglePending}
              onCheckedChange={handleToggle}
            />
          </div>
          {toggleState.message && (
            <p
              className={
                toggleState.ok
                  ? "text-sm text-green-600"
                  : "text-sm text-destructive"
              }
            >
              {toggleState.message}
            </p>
          )}
          <form ref={toggleFormRef} action={toggleAction} className="hidden">
            <input
              type="hidden"
              name="enabled"
              defaultValue={String(notificationsEnabled)}
            />
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
