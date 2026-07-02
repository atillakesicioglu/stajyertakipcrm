import { prisma } from "@/lib/prisma";
import { isSameDateOnly } from "@/lib/date";

type TaskRef = { id: string };
type InternRef = { id: string };

/** Eksik hücreleri doldurur; stajyerler hafta boyunca farklı işlere döner. */
export async function ensureWeeklyOfficeAssignments(
  weekDates: Date[],
  tasks: TaskRef[],
  interns: InternRef[]
): Promise<void> {
  if (interns.length === 0 || tasks.length === 0 || weekDates.length === 0) {
    return;
  }

  const existing = await prisma.officeTaskAssignment.findMany({
    where: { date: { in: weekDates } },
    select: { officeTaskId: true, date: true, userId: true },
  });

  const toCreate: { userId: string; officeTaskId: string; date: Date }[] = [];

  for (let dayIndex = 0; dayIndex < weekDates.length; dayIndex++) {
    const date = weekDates[dayIndex]!;
    const usedInternIds = new Set(
      existing
        .filter((a) => isSameDateOnly(a.date, date))
        .map((a) => a.userId)
    );

    const hasCell = (taskId: string) =>
      existing.some(
        (a) => isSameDateOnly(a.date, date) && a.officeTaskId === taskId
      );

    const pickIntern = (startIdx: number): InternRef | null => {
      for (let offset = 0; offset < interns.length; offset++) {
        const intern = interns[(startIdx + offset) % interns.length]!;
        if (!usedInternIds.has(intern.id)) {
          return intern;
        }
      }
      return null;
    };

    const assign = (taskId: string, internId: string) => {
      toCreate.push({ userId: internId, officeTaskId: taskId, date });
      usedInternIds.add(internId);
      existing.push({ officeTaskId: taskId, date, userId: internId });
    };

    if (interns.length >= tasks.length) {
      for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
        const task = tasks[taskIndex]!;
        if (hasCell(task.id)) continue;

        const intern = pickIntern((taskIndex + dayIndex) % interns.length);
        if (intern) assign(task.id, intern.id);
      }
    } else {
      const taskOrder = tasks.map(
        (_, i) => tasks[(i + dayIndex) % tasks.length]!
      );

      for (let k = 0; k < interns.length; k++) {
        const task = taskOrder[k]!;
        if (hasCell(task.id)) continue;

        const intern = pickIntern((k + dayIndex) % interns.length);
        if (intern) assign(task.id, intern.id);
      }
    }
  }

  if (toCreate.length > 0) {
    await prisma.officeTaskAssignment.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }
}
