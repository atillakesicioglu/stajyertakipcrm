"use client";

import { useActionState, useEffect } from "react";
import { ShieldPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { createAdmin, type AdminActionResult } from "@/lib/actions/admins";
import { formatDate } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  lastLoginAt: Date | null;
};

export function CreateAdminCard({ admins }: { admins: AdminUserRow[] }) {
  const [state, formAction] = useActionState<
    AdminActionResult | undefined,
    FormData
  >(createAdmin, undefined);

  useEffect(() => {
    if (state?.ok) {
      const form = document.getElementById("create-admin-form") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Yöneticiler</CardTitle>
        <CardDescription>
          Yeni yönetici ekleyin. İlk girişte kendi şifresini belirler.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form id="create-admin-form" action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Ad Soyad</Label>
            <Input id="admin-name" name="name" required placeholder="Örn: Ayşe Yılmaz" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">E-posta</Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              required
              placeholder="admin@firma.com"
            />
          </div>
          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state?.ok && state.message && (
            <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {state.message}
            </p>
          )}
          <FormSubmitButton
            label="Yönetici Ekle"
            icon={ShieldPlus}
            className="w-full sm:w-auto"
          />
        </form>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Mevcut yöneticiler ({admins.length})</p>
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kayıtlı yönetici yok.</p>
          ) : (
            <ul className="space-y-2">
              {admins.map((admin) => (
                <li
                  key={admin.id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{admin.name}</p>
                  <p className="text-muted-foreground">{admin.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Son giriş:{" "}
                    {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : "Henüz yok"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
