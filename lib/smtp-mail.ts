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

function extractSmtpAddress(value: unknown): string {
  if (typeof value === "string") return normalizeEmail(value);
  if (
    value &&
    typeof value === "object" &&
    "address" in value &&
    typeof (value as { address: unknown }).address === "string"
  ) {
    return normalizeEmail((value as { address: string }).address);
  }
  const raw = String(value ?? "");
  const match = raw.match(/[^\s<>]+@[^\s<>]+/);
  return match ? normalizeEmail(match[0]) : normalizeEmail(raw);
}

function recipientListed(addresses: string[], recipient: string): boolean {
  return addresses.some((addr) => addr === recipient);
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
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000,
    tls: {
      minVersion: "TLSv1.2",
    },
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
    });

    const accepted = (info.accepted ?? [])
      .map(extractSmtpAddress)
      .filter((addr: string) => addr.includes("@"));
    const rejected = (info.rejected ?? [])
      .map(extractSmtpAddress)
      .filter((addr: string) => addr.includes("@"));

    if (recipientListed(rejected, recipient)) {
      return {
        ok: false,
        reason: `SMTP sunucusu alıcıyı reddetti: ${recipient}`,
      };
    }

    // Bazı kurumsal sunucular (cPanel, Plesk, TRDNS vb.) boş accepted döner;
    // hata fırlatılmadıysa gönderim başarılı kabul edilir.
    const deliveryConfirmed =
      accepted.length === 0 || recipientListed(accepted, recipient);

    if (!deliveryConfirmed) {
      console.error("SMTP beklenmeyen yanıt:", {
        recipient,
        accepted,
        rejected,
        response: info.response,
        messageId: info.messageId,
      });
      return {
        ok: false,
        reason: `Mail ${recipient} adresine iletilemedi. Sunucu yanıtı: ${
          info.response || accepted.join(", ") || "bilinmiyor"
        }`,
      };
    }

    return {
      ok: true,
      accepted: accepted.length ? accepted : [recipient],
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
