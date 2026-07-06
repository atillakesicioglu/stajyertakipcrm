"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Mail, Save, Send } from "lucide-react";
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
  saveAdminSmtpSettings,
  testAdminSmtpSettings,
  type SmtpSettingsActionState,
} from "@/lib/actions/smtp-settings";
import type { AdminSmtpSettingsView } from "@/lib/admin-smtp";

const initialState: SmtpSettingsActionState = { ok: false };

function getStatusBadge(settings: AdminSmtpSettingsView) {
  if (!settings.smtpHost || !settings.hasSavedPassword) {
    return { label: "Yapılandırılmamış", variant: "muted" as const };
  }
  if (!settings.smtpMailEnabled) {
    return { label: "Kayıtlı — gönderim kapalı", variant: "secondary" as const };
  }
  return { label: "Aktif", variant: "success" as const };
}

function collectFormData(
  form: HTMLFormElement,
  secure: boolean,
  mailEnabled: boolean
) {
  const fd = new FormData(form);
  if (secure) fd.set("smtpSecure", "on");
  else fd.delete("smtpSecure");
  if (mailEnabled) fd.set("smtpMailEnabled", "on");
  else fd.delete("smtpMailEnabled");
  return fd;
}

export function SmtpMailSettingsCard({
  settings,
}: {
  settings: AdminSmtpSettingsView;
}) {
  const [testState, testAction, testPending] = useActionState(
    testAdminSmtpSettings,
    initialState
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveAdminSmtpSettings,
    initialState
  );
  const [testPassed, setTestPassed] = useState(false);
  const [mailEnabled, setMailEnabled] = useState(
    settings.smtpMailEnabled || !settings.hasSavedPassword
  );
  const [secure, setSecure] = useState(
    settings.smtpPort === 465 ? true : settings.smtpSecure
  );

  useEffect(() => {
    if (testState.ok) {
      setTestPassed(true);
      setMailEnabled(true);
    }
  }, [testState]);

  const status = getStatusBadge(settings);
  const formId = "admin-smtp-settings-form";

  function handleTest() {
    setTestPassed(false);
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    testAction(collectFormData(form, secure, mailEnabled));
  }

  function handleSave() {
    if (!testPassed) return;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const fd = collectFormData(form, secure, mailEnabled);
    fd.set("testPassed", "true");
    saveAction(fd);
  }

  return (
    <Card className="h-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Mail Gönderim Ayarları
        </CardTitle>
        <CardDescription>
          Kendi mail sunucunuzu tanımlayın. Görev atadığınızda stajyerin
          kayıtlı e-posta adresine sizin mail hesabınızdan bildirim gider.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Durum</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <form id={formId} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="smtpHost">SMTP sunucu</Label>
            <Input
              id="smtpHost"
              name="smtpHost"
              placeholder="smtp.gmail.com"
              defaultValue={settings.smtpHost ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpPort">Port</Label>
            <Input
              id="smtpPort"
              name="smtpPort"
              type="number"
              placeholder="587"
              defaultValue={settings.smtpPort ?? 587}
              required
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
            <Label htmlFor="smtpSecure">SSL / TLS</Label>
            <Switch
              id="smtpSecure"
              checked={secure}
              onCheckedChange={setSecure}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailFromAddress">Gönderen e-posta</Label>
            <Input
              id="mailFromAddress"
              name="mailFromAddress"
              type="email"
              placeholder="siz@firma.com"
              defaultValue={settings.mailFromAddress ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailFromName">Görünen ad (isteğe bağlı)</Label>
            <Input
              id="mailFromName"
              name="mailFromName"
              placeholder="Stajyer Takip"
              defaultValue={settings.mailFromName ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpUser">Kullanıcı adı</Label>
            <Input
              id="smtpUser"
              name="smtpUser"
              placeholder="siz@firma.com"
              defaultValue={settings.smtpUser ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpPassword">Şifre / uygulama şifresi</Label>
            <Input
              id="smtpPassword"
              name="smtpPassword"
              type="password"
              placeholder={
                settings.hasSavedPassword
                  ? "Değiştirmek için yeni şifre girin"
                  : "••••••••"
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="smtpMailEnabled">Görev atamada mail gönder</Label>
              <p className="text-xs text-muted-foreground">
                Açıkken stajyere iş atandığında mail gider.
              </p>
            </div>
            <Switch
              id="smtpMailEnabled"
              checked={mailEnabled}
              onCheckedChange={setMailEnabled}
            />
          </div>
        </form>

        {testState.message && (
          <p
            className={
              testState.ok
                ? "text-sm text-green-600"
                : "text-sm text-destructive"
            }
          >
            {testState.message}
          </p>
        )}
        {saveState.message && (
          <p
            className={
              saveState.ok
                ? "text-sm text-green-600"
                : "text-sm text-destructive"
            }
          >
            {saveState.message}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={testPending}
            className="flex-1"
            onClick={handleTest}
          >
            {testPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Test et
          </Button>

          <Button
            type="button"
            disabled={savePending || !testPassed}
            className="flex-1"
            onClick={handleSave}
          >
            {savePending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Kaydet
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Önce <strong>Test et</strong> ile bağlantıyı doğrulayın, ardından{" "}
          <strong>Kaydet</strong> ile kalıcı hale getirin. Gmail için:{" "}
          <code className="text-xs">smtp.gmail.com</code>, port{" "}
          <code className="text-xs">587</code>, SSL/TLS kapalı, uygulama şifresi.
        </p>
      </CardContent>
    </Card>
  );
}
