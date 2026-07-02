import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/date";
import {
  ensureDefaultOfficeTasks,
  getOrderedOfficeTasks,
} from "@/lib/office-tasks-defaults";

function getDayOffset(today: Date): number {
  return Math.floor(today.getTime() / 86_400_000);
}

/** Stajyer i, gün offset'ine göre farklı göreve atanır (döngüsel rotasyon). */
function buildRotationAssignments(
  interns: { id: string }[],
  tasks: { id: string }[],
  today: Date
): { userId: string; officeTaskId: string }[] {
  const count = Math.min(interns.length, tasks.length);
  const dayOffset = getDayOffset(today);
  const assignments: { userId: string; officeTaskId: string }[] = [];

  for (let i = 0; i < count; i++) {
    const taskIndex = (i + dayOffset) % tasks.length;
    assignments.push({
      userId: interns[i]!.id,
      officeTaskId: tasks[taskIndex]!.id,
    });
  }

  return assignments;
}

function assignmentsMatchPlan(
  existing: { userId: string; officeTaskId: string }[],
  plan: { userId: string; officeTaskId: string }[]
): boolean {
  if (existing.length !== plan.length) return false;

  const key = (a: { userId: string; officeTaskId: string }) =>
    `${a.userId}:${a.officeTaskId}`;
  const existingKeys = new Set(existing.map(key));
  return plan.every((p) => existingKeys.has(key(p)));
}

/**
 * Bugün için 5 görevi stajyerlere döngüsel dağıtır.
 * Her stajyer günde bir görev alır; ertesi gün farklı göreve geçer.
 */
export async function ensureTodayOfficeAssignments(): Promise<void> {
  await ensureDefaultOfficeTasks();
  const today = toDateOnly(new Date());

  const [tasks, interns] = await Promise.all([
    getOrderedOfficeTasks(),
    prisma.user.findMany({
      where: { role: "INTERN" },
      orderBy: { name: "asc" },
      select: { id: true },
    }),
  ]);

  if (tasks.length === 0 || interns.length === 0) return;

  const plan = buildRotationAssignments(interns, tasks, today);

  const existing = await prisma.officeTaskAssignment.findMany({
    where: { date: today },
    select: {
      id: true,
      userId: true,
      officeTaskId: true,
      completed: true,
    },
  });

  if (assignmentsMatchPlan(existing, plan)) return;

  const anyCompleted = existing.some((a) => a.completed);
  if (anyCompleted) return;

  if (existing.length > 0) {
    await prisma.officeTaskAssignment.deleteMany({ where: { date: today } });
  }

  await prisma.officeTaskAssignment.createMany({
    data: plan.map((p) => ({
      userId: p.userId,
      officeTaskId: p.officeTaskId,
      date: today,
    })),
  });
}
