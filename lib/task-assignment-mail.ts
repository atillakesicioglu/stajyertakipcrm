import { formatDateTR } from "@/lib/date";
import { buildMailHtml } from "@/lib/mail-html";
import {
  isSameMailbox,
  normalizeEmail,
  validateDistinctMailboxes,
} from "@/lib/email-utils";
import { getAdminSmtpConfig } from "@/lib/admin-smtp";
import { sendSmtpMail } from "@/lib/smtp-mail";

export type TaskAssignedMailResult =
  | { ok: true; to: string; messageId?: string }
  | { ok: false; reason: string };

export async function sendTaskAssignedEmail({
  adminId,
  internEmail,
  internName,
  taskTitle,
  description,
  dueDate,
}: {
  adminId: string;
  internEmail: string;
  internName: string;
  taskTitle: string;
  description: string;
  dueDate: Date | null;
}): Promise<TaskAssignedMailResult> {
  try {
    const to = normalizeEmail(internEmail);
    if (!to) {
      return { ok: false, reason: "Stajyerin e-posta adresi bulunamadı." };
    }

    const smtpResult = await getAdminSmtpConfig(adminId);
    if (!smtpResult.ok) {
      return { ok: false, reason: smtpResult.reason };
    }

    const smtp = smtpResult.config;
    const mailboxError = validateDistinctMailboxes(to, smtp.fromAddress);
    if (mailboxError) {
      return { ok: false, reason: mailboxError };
    }

    const details = [
      { label: "Görev", value: taskTitle },
      { label: "Açıklama", value: description },
      { label: "Stajyer", value: internName },
      { label: "Alıcı", value: to },
    ];
    if (dueDate) {
      details.push({
        label: "Teslim tarihi",
        value: formatDateTR(dueDate),
      });
    }

    const text = [
      "Yeni görev atandı",
      "",
      `Görev: ${taskTitle}`,
      `Açıklama: ${description}`,
      `Stajyer: ${internName}`,
      dueDate ? `Teslim: ${formatDateTR(dueDate)}` : "",
      "",
      "Panele git: /gorevler",
    ]
      .filter(Boolean)
      .join("\n");

    const html = buildMailHtml({
      title: "Yeni görev atandı",
      description:
        "Size yeni bir görev atandı. Detayları panelden inceleyebilirsiniz.",
      details,
      linkPath: "/gorevler",
    });

    const result = await sendSmtpMail(smtp, {
      to,
      subject: `Yeni görev atandı: ${taskTitle}`,
      html,
      text,
    });

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    const unexpectedSenderCopy = result.accepted.some(
      (addr) => isSameMailbox(addr, smtp.fromAddress) && !isSameMailbox(addr, to)
    );
    if (unexpectedSenderCopy) {
      return {
        ok: false,
        reason:
          "SMTP yanıtı gönderen adresini alıcı olarak da kabul etti. Stajyer e-postası muhtemelen sizin Gmail kutunuzla aynı — farklı bir e-posta kullanın.",
      };
    }

    return { ok: true, to, messageId: result.messageId };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Mail gönderilemedi.",
    };
  }
}
