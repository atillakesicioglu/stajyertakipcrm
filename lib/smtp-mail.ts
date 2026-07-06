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
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
}

export async function sendSmtpMail(
  config: SmtpConfig,
  {
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }
): Promise<SendSmtpResult> {
  try {
    const transport = createTransport(config);
    await transport.sendMail({
      from: formatFrom(config),
      to,
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
  }
}

export async function verifySmtpConnection(
  config: SmtpConfig
): Promise<SendSmtpResult> {
  try {
    const transport = createTransport(config);
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
  }
}
