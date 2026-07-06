import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { normalizeEmail } from "@/lib/email-utils";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromAddress: string;
  fromName?: string | null;
};

export type SendSmtpResult =
  | { ok: true; accepted: string[]; messageId?: string }
  | { ok: false; reason: string };

function formatFrom(config: SmtpConfig): string {
  if (config.fromName?.trim()) {
    return `${config.fromName.trim()} <${config.fromAddress}>`;
  }
  return config.fromAddress;
}

function createTransport(config: SmtpConfig): Transporter {
  const implicitTls = config.port === 465;
  const useTls =
    implicitTls || config.secure || config.port === 587 || config.port === 2525;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: implicitTls,
    requireTLS: !implicitTls && useTls,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 15_000,
  });
}

export async function sendSmtpMail(
  config: SmtpConfig,
  {
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }
): Promise<SendSmtpResult> {
  const recipient = normalizeEmail(to);
  const transport = createTransport(config);

  try {
    const info = await transport.sendMail({
      from: formatFrom(config),
      to: recipient,
      replyTo: config.fromAddress,
      subject,
      text: text ?? subject,
      html,
      envelope: {
        from: config.fromAddress,
        to: [recipient],
      },
    });

    const accepted = (info.accepted ?? []).map((a: unknown) =>
      normalizeEmail(typeof a === "string" ? a : String(a))
    );
    const rejected = (info.rejected ?? []).map((r: unknown) =>
      normalizeEmail(typeof r === "string" ? r : String(r))
    );

    if (rejected.includes(recipient)) {
      return {
        ok: false,
        reason: `SMTP sunucusu alıcıyı reddetti: ${recipient}`,
      };
    }

    if (!accepted.includes(recipient)) {
      return {
        ok: false,
        reason: `Mail ${recipient} adresine iletilemedi. SMTP kabul listesi: ${
          accepted.length ? accepted.join(", ") : "(boş)"
        }`,
      };
    }

    return {
      ok: true,
      accepted,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("SMTP mail gönderilemedi:", error);
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : "SMTP bağlantısı başarısız.",
    };
  } finally {
    transport.close();
  }
}

export async function verifySmtpConnection(
  config: SmtpConfig
): Promise<SendSmtpResult> {
  const transport = createTransport(config);
  try {
    await transport.verify();
    return { ok: true, accepted: [normalizeEmail(config.fromAddress)] };
  } catch (error) {
    console.error("SMTP doğrulama başarısız:", error);
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : "SMTP ayarları doğrulanamadı.",
    };
  } finally {
    transport.close();
  }
}
