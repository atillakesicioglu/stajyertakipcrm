"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut, auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-posta veya şifre hatalı." };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await logActivity(user.id, "LOGIN", "/login", "Panele giriş yaptı");
  }

  redirect("/isler");
}

export async function logoutAction() {
  const session = await auth();
  if (session?.user) {
    await logActivity(session.user.id, "LOGOUT", undefined, "Çıkış yaptı");
  }
  await signOut({ redirectTo: "/login" });
}
