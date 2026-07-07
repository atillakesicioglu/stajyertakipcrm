import nodemailer from "nodemailer";
import type { SentMessageInfo, Transporter } from "nodemailer";
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
  | {
      ok: true;
      accepted: string[];
      messageId?: string;
      serverResponse?: string;
    }
  | { ok: false; reason: string };

type NodemailerErrorLike = Error & {
  code?: unknown;
  command?: unknown;
  response?: unknown;
  responseCode?: unknown;
};

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

function formatSmtpErrorDetails(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const e = error as NodemailerErrorLike;

  const code = typeof e.code === "string" ? e.code : undefined;
  const command = typeof e.command === "string" ? e.command : undefined;
  const response =
    typeof e.response === "string"
      ? e.response
      : typeof e.responseCode === "number"
        ? String(e.responseCode)
        : undefined;

  const parts = [
    code && `code=${code}`,
    command && `cmd=${command}`,
    response && `resp=${response}`,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

function hasPositiveSmtpResponse(response: string | undefined): boolean {
  if (!response?.trim()) return false;
  return /\b250[\s-]/.test(response) || response.trim().startsWith("250");
}

function evaluateSendResult(
  info: SentMessageInfo,
  recipient: string
): SendSmtpResult {
  const accepted = (info.accepted ?? [])
    .map(extractSmtpAddress)
    .filter((addr: string) => addr.includes("@"));
  const rejected = (info.rejected ?? [])
    .map(extractSmtpAddress)
    .filter((addr: string) => addr.includes("@"));
  const serverResponse = info.response?.trim() || undefined;
  const messageId = info.messageId?.trim() || undefined;

  if (recipientListed(rejected, recipient)) {
    return {
      ok: false,
      reason: `SMTP sunucusu alıcıyı reddetti: ${recipient}${
        serverResponse ? ` — ${serverResponse}` : ""
      }`,
    };
  }

  if (recipientListed(accepted, recipient)) {
    return {
      ok: true,
      accepted,
      messageId,
      serverResponse,
    };
  }

  const has250 = hasPositiveSmtpResponse(serverResponse);
  const hasMessageId = Boolean(messageId);

  // Sunucu kuyruğa aldıysa genelde 250 + messageId döner.
  if (has250 && hasMessageId) {
    return {
      ok: true,
      accepted: accepted.length ? accepted : [recipient],
      messageId,
      serverResponse,
    };
  }

  if (has250 && accepted.length > 0) {
    return {
      ok: true,
      accepted,
      messageId,
      serverResponse,
    };
  }

  console.error("SMTP belirsiz veya başarısız yanıt:", {
    recipient,
    accepted,
    rejected,
    response: serverResponse,
    messageId,
    envelope: info.envelope,
  });

  if (!has250 && !hasMessageId && accepted.length === 0) {
    return {
      ok: false,
      reason:
        `SMTP sunucusu gönderimi onaylamadı. ` +
        `Yanıt: ${serverResponse || "boş yanıt"} — ` +
        `alıcı listesinde ${recipient} görünmüyor.`,
    };
  }

  return {
    ok: false,
    reason: `Mail ${recipient} adresine iletilemedi. Sunucu yanıtı: ${
      serverResponse || accepted.join(", ") || "bilinmiyor"
    }`,
  };
}

function createTransport(config: SmtpConfig): Transporter {
  const implicitTls = config.port === 465;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: implicitTls,
    requireTLS: !implicitTls && (config.secure || config.port === 587),
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
  const envelopeFrom = normalizeEmail(config.fromAddress);
  const transport = createTransport(config);

  try {
    const info = await transport.sendMail({
      from: formatFrom(config),
      to: recipient,
      replyTo: config.fromAddress,
      envelope: {
        from: envelopeFrom,
        to: [recipient],
      },
      subject,
      text: text ?? subject,
      html,
    });

    return evaluateSendResult(info, recipient);
  } catch (error) {
    console.error("SMTP mail gönderilemedi:", error);
    return {
      ok: false,
      reason:
        error instanceof Error
          ? `${error.message}${formatSmtpErrorDetails(error)}`
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
          ? `${error.message}${formatSmtpErrorDetails(error)}`
          : "SMTP ayarları doğrulanamadı.",
    };
  } finally {
    transport.close();
  }
}
