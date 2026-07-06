import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/smtp-crypto";
import type { SmtpConfig } from "@/lib/smtp-mail";

export type AdminSmtpSettingsView = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  mailFromAddress: string | null;
  mailFromName: string | null;
  smtpMailEnabled: boolean;
  smtpLastTestedAt: Date | null;
  hasSavedPassword: boolean;
};

export type AdminSmtpConfigResult =
  | { ok: true; config: SmtpConfig }
  | { ok: false; reason: string };

export async function getAdminSmtpSettingsView(
  adminId: string
): Promise<AdminSmtpSettingsView | null> {
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      mailFromAddress: true,
      mailFromName: true,
      smtpMailEnabled: true,
      smtpLastTestedAt: true,
      smtpPasswordEnc: true,
    },
  });

  if (!user) return null;

  return {
    smtpHost: user.smtpHost,
    smtpPort: user.smtpPort,
    smtpSecure: user.smtpSecure,
    smtpUser: user.smtpUser,
    mailFromAddress: user.mailFromAddress,
    mailFromName: user.mailFromName,
    smtpMailEnabled: user.smtpMailEnabled,
    smtpLastTestedAt: user.smtpLastTestedAt,
    hasSavedPassword: Boolean(user.smtpPasswordEnc),
  };
}

export async function getAdminSmtpConfig(
  adminId: string
): Promise<AdminSmtpConfigResult> {
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: {
      role: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPasswordEnc: true,
      mailFromAddress: true,
      mailFromName: true,
      smtpMailEnabled: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    return { ok: false, reason: "Admin SMTP ayarı bulunamadı." };
  }
  if (!user.smtpMailEnabled) {
    return { ok: false, reason: "Mail gönderimi kapalı. Ayarlardan açın." };
  }
  if (
    !user.smtpHost ||
    !user.smtpPort ||
    !user.smtpUser ||
    !user.smtpPasswordEnc ||
    !user.mailFromAddress
  ) {
    return { ok: false, reason: "SMTP ayarları eksik. Test edip kaydedin." };
  }

  try {
    return {
      ok: true,
      config: {
        host: user.smtpHost,
        port: user.smtpPort,
        secure: user.smtpPort === 465 ? true : user.smtpSecure,
        user: user.smtpUser,
        password: decryptSecret(user.smtpPasswordEnc),
        fromAddress: user.mailFromAddress,
        fromName: user.mailFromName,
      },
    };
  } catch (error) {
    console.error("SMTP şifresi çözülemedi:", error);
    return {
      ok: false,
      reason:
        "Kayıtlı SMTP şifresi okunamadı. Ayarlardan şifreyi girip yeniden kaydedin.",
    };
  }
}
