"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut, auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { isUnsetPassword } from "@/lib/password";

export type LoginState = { error?: string };
export type SetPasswordState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "E-posta veya şifre hatalı." };
  }

  if ((await isUnsetPassword(user.passwordHash)) && password !== "") {
    return {
      error:
        "Bu hesap için henüz şifre belirlenmedi. İlk girişte şifre alanını boş bırakın.",
    };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-posta veya şifre hatalı." };
    }
    throw error;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await logActivity(user.id, "LOGIN", "/login", "Panele giriş yaptı");

  if (await isUnsetPassword(user.passwordHash)) {
    redirect("/sifre-belirle");
  }

  redirect("/isler");
}

const setPasswordSchema = z
  .object({
    password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
    confirmPassword: z.string().min(1, "Şifre tekrarı gerekli."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export async function setPasswordAction(
  _prevState: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { error: "Kullanıcı bulunamadı." };
  }

  if (!(await isUnsetPassword(user.passwordHash))) {
    redirect("/isler");
  }

  const parsed = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await logActivity(
    user.id,
    "SET_PASSWORD",
    "/sifre-belirle",
    "İlk şifresini belirledi"
  );

  await signOut({ redirect: false });
  await signIn("credentials", {
    email: user.email,
    password,
    redirectTo: "/isler",
  });

  redirect("/isler");
}

export async function logoutAction() {
  const session = await auth();
  if (session?.user) {
    await logActivity(session.user.id, "LOGOUT", undefined, "Çıkış yaptı");
  }
  await signOut({ redirectTo: "/login" });
}
