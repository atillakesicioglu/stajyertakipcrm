import type { SubmissionData, TaskData } from "@/lib/types";

export type TimelineEventType =
  | "assigned"
  | "started"
  | "submitted"
  | "revision"
  | "approved";

export type TimelineEvent = {
  type: TimelineEventType;
  at: Date;
  title: string;
  detail?: string;
  submission?: SubmissionData;
};

const TYPE_ORDER: Record<TimelineEventType, number> = {
  assigned: 0,
  started: 1,
  submitted: 2,
  revision: 3,
  approved: 4,
};

export function buildTaskTimeline(task: TaskData): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    type: "assigned",
    at: new Date(task.createdAt),
    title: "İş atandı",
    detail: task.createdBy
      ? `${task.createdBy.name} tarafından ${task.assignedTo.name} kişisine atandı`
      : `${task.assignedTo.name} kişisine atandı`,
  });

  const starts = [...task.starts].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );
  for (const [i, start] of starts.entries()) {
    events.push({
      type: "started",
      at: new Date(start.startedAt),
      title: starts.length > 1 ? `İşe başlandı (${i + 1}. kez)` : "İşe başlandı",
      detail: `${task.assignedTo.name} işe başladı`,
    });
  }

  const submissions = [...task.submissions].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );
  for (const [i, sub] of submissions.entries()) {
    events.push({
      type: "submitted",
      at: new Date(sub.submittedAt),
      title: submissions.length > 1 ? `İş teslim edildi (${i + 1}. teslim)` : "İş teslim edildi",
      detail: sub.textContent ?? undefined,
      submission: sub,
    });
  }

  const revisions = [...task.revisions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  for (const [i, rev] of revisions.entries()) {
    events.push({
      type: "revision",
      at: new Date(rev.createdAt),
      title: revisions.length > 1 ? `Revize istendi (${i + 1}. revize)` : "Revize istendi",
      detail: rev.note,
    });
  }

  if (task.approvedAt) {
    events.push({
      type: "approved",
      at: new Date(task.approvedAt),
      title: "İş onaylandı",
      detail: "Yönetici işi onayladı",
    });
  } else if (task.status === "APPROVED" && task.updatedAt) {
    events.push({
      type: "approved",
      at: new Date(task.updatedAt),
      title: "İş onaylandı",
      detail: "Yönetici işi onayladı",
    });
  }

  return events.sort((a, b) => {
    const diff = a.at.getTime() - b.at.getTime();
    if (diff !== 0) return diff;
    return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
  });
}
