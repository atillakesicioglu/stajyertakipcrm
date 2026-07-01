"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { setPasswordAction, type SetPasswordState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
      Şifreyi Kaydet
    </Button>
  );
}

export default function SetPasswordPage() {
  const [state, formAction] = useActionState<SetPasswordState, FormData>(
    setPasswordAction,
    {}
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="size-6" />
          </div>
          <CardTitle className="text-2xl">Şifrenizi Belirleyin</CardTitle>
          <CardDescription>
            Devam etmek için hesabınız için bir şifre oluşturun. Bu şifreyle
            sonraki girişlerinizi yapacaksınız.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Yeni Şifre</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="En az 6 karakter"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Şifrenizi tekrar girin"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {state.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
