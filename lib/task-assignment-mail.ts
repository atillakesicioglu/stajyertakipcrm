import { formatDateTR } from "@/lib/date";
import { buildMailHtml } from "@/lib/mail-html";
import { getAdminSmtpConfig } from "@/lib/admin-smtp";
import { sendSmtpMail, type SendSmtpResult } from "@/lib/smtp-mail";

export type TaskAssignedMailResult =
  | { ok: true; to: string }
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
    if (!internEmail?.trim()) {
      return { ok: false, reason: "Stajyerin e-posta adresi bulunamadı." };
    }

    const smtpResult = await getAdminSmtpConfig(adminId);
    if (!smtpResult.ok) {
      console.warn("Görev atama maili atlandı:", smtpResult.reason, {
        adminId,
        internEmail,
      });
      return { ok: false, reason: smtpResult.reason };
    }

    const smtp = smtpResult.config;
    const details = [
      { label: "Görev", value: taskTitle },
      { label: "Açıklama", value: description },
      { label: "Stajyer", value: internName },
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
      to: internEmail,
      bcc: smtp.fromAddress,
      subject: `Yeni görev atandı: ${taskTitle}`,
      html,
    });

    if (!result.ok) {
      console.error("Görev atama maili gönderilemedi:", result.reason, {
        adminId,
        internEmail,
      });
      return { ok: false, reason: result.reason };
    }

    console.info("Görev atama maili gönderildi", { adminId, internEmail });
    return { ok: true, to: internEmail };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Mail gönderilemedi.";
    console.error("Görev atama maili gönderilemedi:", error);
    return { ok: false, reason };
  }
}
