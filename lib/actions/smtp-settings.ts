"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { decryptSecret, encryptSecret } from "@/lib/smtp-crypto";
import { buildMailHtml } from "@/lib/mail-html";
import {
  sendSmtpMail,
  verifySmtpConnection,
  type SmtpConfig,
} from "@/lib/smtp-mail";

export type SmtpSettingsActionState = {
  ok: boolean;
  message?: string;
};

const smtpFormSchema = z.object({
  smtpHost: z.string().trim().min(1, "SMTP sunucu gerekli."),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim().min(1, "Kullanıcı adı gerekli."),
  mailFromAddress: z.string().trim().email("Geçerli gönderen e-posta girin."),
  mailFromName: z.string().trim().optional(),
  smtpPassword: z.string().optional(),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return session.user;
}

function parseSmtpForm(formData: FormData) {
  return smtpFormSchema.safeParse({
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: formData.get("smtpSecure") === "on",
    smtpUser: formData.get("smtpUser"),
    mailFromAddress: formData.get("mailFromAddress"),
    mailFromName: formData.get("mailFromName") || undefined,
    smtpPassword: String(formData.get("smtpPassword") ?? ""),
  });
}

async function resolvePassword(
  adminId: string,
  passwordInput: string
): Promise<string | null> {
  if (passwordInput.trim()) return passwordInput;
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { smtpPasswordEnc: true },
  });
  if (!user?.smtpPasswordEnc) return null;
  return decryptSecret(user.smtpPasswordEnc);
}

function toSmtpConfig(
  parsed: z.infer<typeof smtpFormSchema>,
  password: string
): SmtpConfig {
  const port = parsed.smtpPort;
  const secure = port === 465 ? true : parsed.smtpSecure;
  return {
    host: parsed.smtpHost,
    port,
    secure,
    user: parsed.smtpUser,
    password,
    fromAddress: parsed.mailFromAddress,
    fromName: parsed.mailFromName ?? null,
  };
}

export async function testAdminSmtpSettings(
  _prev: SmtpSettingsActionState,
  formData: FormData
): Promise<SmtpSettingsActionState> {
  try {
    const admin = await requireAdmin();
    const parsed = parseSmtpForm(formData);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0].message };
    }

    const password = await resolvePassword(
      admin.id,
      parsed.data.smtpPassword ?? ""
    );
    if (!password) {
      return { ok: false, message: "SMTP şifresi gerekli." };
    }

    const config = toSmtpConfig(parsed.data, password);
    const verify = await verifySmtpConnection(config);
    if (!verify.ok) {
      return { ok: false, message: verify.reason };
    }

    const testRecipientRaw = String(formData.get("testRecipientEmail") ?? "").trim();
    const testTo = testRecipientRaw || config.fromAddress;

    const result = await sendSmtpMail(config, {
      to: testTo,
      subject: "Stajyer Takip CRM — SMTP test",
      html: buildMailHtml({
        title: "SMTP testi başarılı",
        description:
          "Mail ayarlarınız doğru çalışıyor. Kaydet butonuyla ayarları kalıcı hale getirebilirsiniz.",
        details: [
          { label: "SMTP sunucu", value: config.host },
          { label: "Gönderen", value: config.fromAddress },
          { label: "Test alıcı", value: testTo },
        ],
        linkPath: "/ayarlar",
      }),
      text: `SMTP testi başarılı. Test alıcı: ${testTo}`,
    });

    if (!result.ok) {
      return { ok: false, message: result.reason };
    }

    const serverDetail = result.serverResponse
      ? ` Sunucu yanıtı: ${result.serverResponse}.`
      : result.messageId
        ? ` Mesaj ID: ${result.messageId}.`
        : "";

    return {
      ok: true,
      message:
        testRecipientRaw
          ? `SMTP sunucusu test mailini kabul etti: ${testTo}.${serverDetail} Gelen kutusu ve spam klasörünü kontrol edin; mail gelmezse domain SPF/DKIM kayıtlarını kontrol edin.`
          : `Test maili gönderildi.${serverDetail} Gelen kutunuzu ve spam klasörünü kontrol edin, ardından kaydedin.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "SMTP testi başarısız.",
    };
  }
}

export async function saveAdminSmtpSettings(
  _prev: SmtpSettingsActionState,
  formData: FormData
): Promise<SmtpSettingsActionState> {
  try {
    const admin = await requireAdmin();
    const parsed = parseSmtpForm(formData);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0].message };
    }

    const testPassed = formData.get("testPassed") === "true";
    if (!testPassed) {
      return {
        ok: false,
        message: "Kaydetmeden önce SMTP testini başarıyla tamamlayın.",
      };
    }

    const password = await resolvePassword(
      admin.id,
      parsed.data.smtpPassword ?? ""
    );
    if (!password) {
      return { ok: false, message: "SMTP şifresi gerekli." };
    }

    const smtpMailEnabled =
      formData.get("smtpMailEnabled") === "on" || testPassed;

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        smtpHost: parsed.data.smtpHost,
        smtpPort: parsed.data.smtpPort,
        smtpSecure: parsed.data.smtpPort === 465 ? true : parsed.data.smtpSecure,
        smtpUser: parsed.data.smtpUser,
        smtpPasswordEnc: encryptSecret(password),
        mailFromAddress: parsed.data.mailFromAddress,
        mailFromName: parsed.data.mailFromName || null,
        smtpLastTestedAt: new Date(),
        smtpMailEnabled,
      },
    });

    revalidatePath("/ayarlar");
    return {
      ok: true,
      message: smtpMailEnabled
        ? "Mail ayarları kaydedildi. Görev atamalarında mail gönderilecek."
        : "Mail ayarları kaydedildi (gönderim kapalı).",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Mail ayarları kaydedilemedi.",
    };
  }
}
