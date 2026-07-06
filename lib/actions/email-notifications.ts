"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import {
  createEmailToken,
  EMAIL_TOKEN_TTL_MS,
  hashEmailToken,
} from "@/lib/email-token";
import { buildMailHtml } from "@/lib/mail-html";

export type EmailNotificationActionState = {
  ok: boolean;
  message?: string;
};

async function requireSessionUser() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Oturum bulunamadı.");
  }
  return session.user;
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Geçersiz e-posta adresi.");

export async function sendVerificationEmailAction(
  _prev: EmailNotificationActionState,
  formData: FormData
): Promise<EmailNotificationActionState> {
  try {
    const user = await requireSessionUser();
    const parsed = emailSchema.safeParse(formData.get("notificationEmail"));

    if (!parsed.success) {
      return { ok: false, message: "Geçersiz e-posta adresi." };
    }

    const email = parsed.data;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        notificationEmail: true,
        notificationEmailVerifiedAt: true,
      },
    });

    if (!dbUser) {
      return { ok: false, message: "Kullanıcı bulunamadı." };
    }

    const emailChanged =
      dbUser.notificationEmail !== email ||
      !dbUser.notificationEmailVerifiedAt;

    if (emailChanged) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          notificationEmail: email,
          notificationEmailVerifiedAt: null,
          emailNotificationsEnabled: false,
        },
      });
    }

    const now = new Date();

    await prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      data: { consumedAt: now },
    });

    const { token, tokenHash } = createEmailToken();
    const expiresAt = new Date(now.getTime() + EMAIL_TOKEN_TTL_MS);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email,
        tokenHash,
        expiresAt,
      },
    });

    await sendMail({
      to: email,
      subject: "E-posta adresinizi doğrulayın",
      html: buildMailHtml({
        title: "E-posta doğrulama",
        description:
          "Bildirim e-postanızı doğrulamak için aşağıdaki bağlantıya tıklayın. Bağlantı 30 dakika geçerlidir.",
        details: [{ label: "E-posta", value: email }],
        linkPath: `/eposta-dogrula?token=${token}`,
        linkLabel: "E-postamı doğrula",
      }),
    });

    revalidatePath("/ayarlar");
    return { ok: true, message: "Doğrulama maili gönderildi." };
  } catch (error) {
    console.error("Doğrulama maili gönderilemedi:", error);
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Doğrulama maili gönderilemedi.",
    };
  }
}

export async function toggleEmailNotificationsAction(
  _prev: EmailNotificationActionState,
  formData: FormData
): Promise<EmailNotificationActionState> {
  try {
    const user = await requireSessionUser();
    const enabled = formData.get("enabled") === "true";

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        notificationEmailVerifiedAt: true,
      },
    });

    if (!dbUser) {
      return { ok: false, message: "Kullanıcı bulunamadı." };
    }

    if (enabled && !dbUser.notificationEmailVerifiedAt) {
      return {
        ok: false,
        message: "E-posta doğrulanmadan bildirimler açılamaz.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailNotificationsEnabled: enabled },
    });

    revalidatePath("/ayarlar");
    return {
      ok: true,
      message: enabled
        ? "Mail bildirimleri açıldı."
        : "Mail bildirimleri kapatıldı.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Ayar kaydedilemedi.",
    };
  }
}

export type EmailVerifyResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function verifyEmailToken(
  token: string | undefined
): Promise<EmailVerifyResult> {
  if (!token?.trim()) {
    return { ok: false, message: "Doğrulama bağlantısı geçersiz." };
  }

  const tokenHash = hashEmailToken(token.trim());
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true } } },
  });

  if (!record) {
    return { ok: false, message: "Doğrulama bağlantısı geçersiz." };
  }

  if (record.consumedAt) {
    return { ok: false, message: "Doğrulama bağlantısı geçersiz." };
  }

  if (record.expiresAt < new Date()) {
    return {
      ok: false,
      message: "Doğrulama bağlantısının süresi dolmuş.",
    };
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        notificationEmail: record.email,
        notificationEmailVerifiedAt: now,
        emailNotificationsEnabled: true,
      },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: now },
    }),
    prisma.emailVerificationToken.updateMany({
      where: {
        userId: record.userId,
        consumedAt: null,
        id: { not: record.id },
      },
      data: { consumedAt: now },
    }),
  ]);

  return { ok: true, message: "E-posta adresiniz doğrulandı." };
}
