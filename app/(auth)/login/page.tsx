"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";
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

async function resolveLoginDestination(): Promise<string> {
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          return data.user.mustSetPassword ? "/sifre-belirle" : "/isler";
        }
      }
    } catch {
      // Oturum henüz hazır olmayabilir, kısa süre sonra tekrar dene.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return "/isler";
}

export default function LoginPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);

    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-posta veya şifre hatalı.");
      setPending(false);
      return;
    }

    const destination = await resolveLoginDestination();
    window.location.replace(destination);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <LogIn className="size-6" />
          </div>
          <CardTitle className="text-2xl">Stajyer Takip CRM</CardTitle>
          <CardDescription>
            Devam etmek için hesabınıza giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ornek@firma.com"
                required
                autoComplete="email"
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={pending}
              />
              <p className="text-xs text-muted">
                İlk giriş yapıyorsanız şifre alanını boş bırakın.
              </p>
            </div>
            {error && (
              <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending} isPending={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
              {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
