import { formatDateTR } from "@/lib/date";
import { buildMailHtml } from "@/lib/mail-html";
import { getAdminSmtpConfig } from "@/lib/admin-smtp";
import { sendSmtpMail } from "@/lib/smtp-mail";

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
}) {
  try {
    const smtp = await getAdminSmtpConfig(adminId);
    if (!smtp) {
      console.warn("Görev atama maili atlandı: admin SMTP yapılandırması yok", {
        adminId,
        internEmail,
      });
      return;
    }

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

    const result = await sendSmtpMail(smtp, {
      to: internEmail,
      subject: `Yeni görev atandı: ${taskTitle}`,
      html: buildMailHtml({
        title: "Yeni görev atandı",
        description: "Size yeni bir görev atandı. Detayları panelden inceleyebilirsiniz.",
        details,
        linkPath: "/gorevler",
      }),
    });

    if (!result.ok) {
      console.error("Görev atama maili gönderilemedi:", result.reason, {
        adminId,
        internEmail,
      });
    } else {
      console.info("Görev atama maili gönderildi", { adminId, internEmail });
    }
  } catch (error) {
    console.error("Görev atama maili gönderilemedi:", error);
  }
}
