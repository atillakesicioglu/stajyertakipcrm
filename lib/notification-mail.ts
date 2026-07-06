import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";

const mailEligibleSelect = {
  notificationEmail: true,
  notificationEmailVerifiedAt: true,
  emailNotificationsEnabled: true,
} as const;

export async function sendNotificationEmailToUser(
  userId: string,
  payload: { subject: string; html: string }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: mailEligibleSelect,
    });

    if (
      !user?.notificationEmail ||
      !user.notificationEmailVerifiedAt ||
      !user.emailNotificationsEnabled
    ) {
      return;
    }

    await sendMail({
      to: user.notificationEmail,
      subject: payload.subject,
      html: payload.html,
    });
  } catch (error) {
    console.error("Kullanıcıya mail bildirimi gönderilemedi:", error);
  }
}

export async function sendNotificationEmailToAdmins(payload: {
  subject: string;
  html: string;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: mailEligibleSelect,
    });

    const recipients = admins.filter(
      (admin) =>
        admin.notificationEmail &&
        admin.notificationEmailVerifiedAt &&
        admin.emailNotificationsEnabled
    );

    await Promise.allSettled(
      recipients.map((admin) =>
        sendMail({
          to: admin.notificationEmail!,
          subject: payload.subject,
          html: payload.html,
        })
      )
    );
  } catch (error) {
    console.error("Adminlere mail bildirimi gönderilemedi:", error);
  }
}
