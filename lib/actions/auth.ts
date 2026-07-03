"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut, auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { isUnsetPassword } from "@/lib/password";

export type SetPasswordState = { error?: string };

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

  void logActivity(
    user.id,
    "SET_PASSWORD",
    "/sifre-belirle",
    "İlk şifresini belirledi"
  ).catch(() => {});

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
    void logActivity(session.user.id, "LOGOUT", undefined, "Çıkış yaptı").catch(
      () => {}
    );
  }
  await signOut({ redirectTo: "/login" });
}
