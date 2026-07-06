import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

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
  | { ok: true }
  | { ok: false; reason: string };

function formatFrom(config: SmtpConfig): string {
  if (config.fromName?.trim()) {
    return `${config.fromName.trim()} <${config.fromAddress}>`;
  }
  return config.fromAddress;
}

function createTransport(config: SmtpConfig): Transporter {
  const secure = config.port === 465;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
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
    bcc,
  }: {
    to: string;
    subject: string;
    html: string;
    bcc?: string;
  }
): Promise<SendSmtpResult> {
  const transport = createTransport(config);
  try {
    await transport.sendMail({
      from: formatFrom(config),
      to,
      bcc: bcc || undefined,
      subject,
      html,
    });
    return { ok: true };
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
  const transport = createTransport({
    ...config,
    secure: config.port === 465,
  });
  try {
    await transport.verify();
    return { ok: true };
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
