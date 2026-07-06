import { formatDateTR, formatWeekdayLabel } from "@/lib/date";
import { buildMailHtml } from "@/lib/mail-html";
import { prisma } from "@/lib/prisma";
import {
  sendNotificationEmailToAdmins,
  sendNotificationEmailToUser,
} from "@/lib/notification-mail";

export async function mailTaskAssignedToIntern({
  userId,
  taskTitle,
  description,
  dueDate,
}: {
  userId: string;
  taskTitle: string;
  description: string;
  dueDate: Date | null;
}) {
  const details = [
    { label: "Görev", value: taskTitle },
    { label: "Açıklama", value: description },
  ];
  if (dueDate) {
    details.push({
      label: "Teslim tarihi",
      value: formatDateTR(dueDate),
    });
  }

  await sendNotificationEmailToUser(userId, {
    subject: `Yeni görev atandı: ${taskTitle}`,
    html: buildMailHtml({
      title: "Yeni görev atandı",
      description:
        "Size yeni bir görev atandı. Detayları panelden inceleyebilirsiniz.",
      details,
      linkPath: "/gorevler",
    }),
  });
}

export async function mailTaskSubmittedToAdmins({
  internName,
  taskTitle,
  submittedAt,
}: {
  internName: string;
  taskTitle: string;
  submittedAt: Date;
}) {
  await sendNotificationEmailToAdmins({
    subject: `Yeni görev teslimi: ${taskTitle}`,
    html: buildMailHtml({
      title: "Yeni görev teslimi",
      description: "Bir stajyer görev teslim etti.",
      details: [
        { label: "Stajyer", value: internName },
        { label: "Görev", value: taskTitle },
        {
          label: "Teslim zamanı",
          value: submittedAt.toLocaleString("tr-TR", {
            timeZone: "Europe/Istanbul",
          }),
        },
      ],
      linkPath: "/gorevler",
    }),
  });
}

export async function mailOfficeTaskAssignedToIntern({
  userId,
  taskTitle,
  date,
}: {
  userId: string;
  taskTitle: string;
  date: Date;
}) {
  await sendNotificationEmailToUser(userId, {
    subject: "Yeni ofis işi atandı",
    html: buildMailHtml({
      title: "Yeni ofis işi atandı",
      description: "Size yeni bir ofis işi atandı.",
      details: [
        { label: "İş", value: taskTitle },
        { label: "Tarih", value: formatWeekdayLabel(date) },
      ],
      linkPath: "/ofis-isleri",
    }),
  });
}

export async function mailOfficeTaskAssignmentsCreated(
  assignments: { userId: string; officeTaskId: string; date: Date }[]
) {
  if (assignments.length === 0) return;

  const taskIds = [...new Set(assignments.map((a) => a.officeTaskId))];
  const tasks = await prisma.officeTask.findMany({
    where: { id: { in: taskIds } },
    select: { id: true, title: true },
  });
  const titleById = new Map(tasks.map((t) => [t.id, t.title]));

  await Promise.allSettled(
    assignments.map((assignment) =>
      mailOfficeTaskAssignedToIntern({
        userId: assignment.userId,
        taskTitle: titleById.get(assignment.officeTaskId) ?? "Ofis işi",
        date: assignment.date,
      })
    )
  );
}

export async function mailDailyReportToAdmins({
  internName,
  reportDate,
  contentSummary,
}: {
  internName: string;
  reportDate: Date;
  contentSummary: string;
}) {
  await sendNotificationEmailToAdmins({
    subject: "Yeni günlük not eklendi",
    html: buildMailHtml({
      title: "Yeni günlük not eklendi",
      description: "Bir stajyer günlük not ekledi.",
      details: [
        { label: "Stajyer", value: internName },
        { label: "Tarih", value: formatDateTR(reportDate) },
        { label: "Özet", value: contentSummary },
      ],
      linkPath: "/gunluk-notlar",
    }),
  });
}
