import { formatDateTR } from "@/lib/date";
import { buildMailHtml } from "@/lib/mail-html";
import { getAdminSmtpConfig } from "@/lib/admin-smtp";
import { sendSmtpMail, type SendSmtpResult } from "@/lib/smtp-mail";

export type TaskAssignedMailResult =
  | { ok: true; to: string }
  | { ok: false; reason: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

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
      console.warn("Görev atama maili atlandı:", smtpResult.reason, {
        adminId,
        internEmail: to,
      });
      return { ok: false, reason: smtpResult.reason };
    }

    const smtp = smtpResult.config;
    const from = normalizeEmail(smtp.fromAddress);

    if (to === from) {
      return {
        ok: false,
        reason:
          "Stajyer e-postası, gönderen adresinizle aynı. Stajyere farklı bir e-posta tanımlayın.",
      };
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

    const html = buildMailHtml({
      title: "Yeni görev atandı",
      description:
        "Size yeni bir görev atandı. Detayları panelden inceleyebilirsiniz.",
      details,
      linkPath: "/gorevler",
    });

    const result: SendSmtpResult = await sendSmtpMail(smtp, {
      to,
      subject: `Yeni görev atandı: ${taskTitle}`,
      html,
    });

    if (!result.ok) {
      console.error("Görev atama maili gönderilemedi:", result.reason, {
        adminId,
        internEmail: to,
      });
      return { ok: false, reason: result.reason };
    }

    console.info("Görev atama maili gönderildi", { adminId, internEmail: to });
    return { ok: true, to };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Mail gönderilemedi.";
    console.error("Görev atama maili gönderilemedi:", error);
    return { ok: false, reason };
  }
}
