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
): Promise<SmtpConfig | null> {
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

  if (
    !user ||
    user.role !== "ADMIN" ||
    !user.smtpHost ||
    !user.smtpPort ||
    !user.smtpUser ||
    !user.smtpPasswordEnc ||
    !user.mailFromAddress
  ) {
    console.warn("Görev maili atlandı: SMTP ayarları eksik", { adminId });
    return null;
  }

  if (!user.smtpMailEnabled) {
    console.warn("Görev maili atlandı: smtpMailEnabled kapalı", { adminId });
    return null;
  }

  try {
    return {
      host: user.smtpHost,
      port: user.smtpPort,
      secure: user.smtpSecure,
      user: user.smtpUser,
      password: decryptSecret(user.smtpPasswordEnc),
      fromAddress: user.mailFromAddress,
      fromName: user.mailFromName,
    };
  } catch (error) {
    console.error("SMTP şifresi çözülemedi:", error);
    return null;
  }
}
