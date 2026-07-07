"use client";

import Image from "next/image";
import {
  CalendarClock,
  MessageSquareWarning,
  User,
  UserPlus,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_BADGE, PRIORITY_LABELS } from "@/lib/constants";
import { formatDate, formatDateOnly } from "@/lib/utils";
import type { TaskStatus } from "@prisma/client";
import type { BadgeVariant } from "@/lib/app-settings-defaults";
import type { TaskData } from "@/lib/types";
import { buildTaskTimeline } from "@/lib/task-timeline";
import {
  TaskAdminActions,
  TaskDeleteForm,
  TaskInternActions,
} from "@/components/task-actions";

export function TaskDetailModal({
  task,
  open,
  onClose,
  role,
  statusLabels,
  statusBadges,
}: {
  task: TaskData | null;
  open: boolean;
  onClose: () => void;
  role: "ADMIN" | "INTERN";
  statusLabels: Record<TaskStatus, string>;
  statusBadges: Record<TaskStatus, BadgeVariant>;
}) {
  if (!task) return null;

  const isAdmin = role === "ADMIN";
  const latestRevision = task.revisions[0];
  const latestSubmission = task.submissions[0];
  const events = buildTaskTimeline(task);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task.title}
      description={
        isAdmin
          ? `${task.assignedTo.name} için atanmış görev`
          : "Size atanan görev detayları"
      }
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusBadges[task.status]}>
            {statusLabels[task.status]}
          </Badge>
          <Badge variant={PRIORITY_BADGE[task.priority]}>
            {PRIORITY_LABELS[task.priority]} Öncelik
          </Badge>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="size-4 shrink-0" />
            <span>
              Atanan:{" "}
              <span className="font-medium text-foreground">
                {task.assignedTo.name}
              </span>
            </span>
          </div>
          {isAdmin && task.createdBy && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserPlus className="size-4 shrink-0" />
              <span>
                Atayan:{" "}
                <span className="font-medium text-foreground">
                  {task.createdBy.name}
                </span>
              </span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="size-4 shrink-0" />
              <span>
                Son teslim:{" "}
                <span className="font-medium text-foreground">
                  {formatDateOnly(task.dueDate)}
                </span>
              </span>
            </div>
          )}
          <div className="text-muted-foreground">
            Oluşturulma:{" "}
            <span className="font-medium text-foreground">
              {formatDate(task.createdAt)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Görev Açıklaması</h3>
          <p className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed">
            {task.description}
          </p>
        </div>

        {task.status === "REVISION_REQUESTED" && latestRevision && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <MessageSquareWarning className="size-4" />
              Güncel Revize Notu
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {latestRevision.note}
            </p>
          </div>
        )}

        {latestSubmission && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Son Teslim</h3>
            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              {latestSubmission.textContent && (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {latestSubmission.textContent}
                </p>
              )}
              {latestSubmission.screenshotUrl && (
                <a
                  href={latestSubmission.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block"
                >
                  <Image
                    src={latestSubmission.screenshotUrl}
                    alt={latestSubmission.screenshotName ?? "Ekran görüntüsü"}
                    width={320}
                    height={200}
                    className="max-h-48 w-auto rounded-md border object-contain"
                    unoptimized
                  />
                </a>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(latestSubmission.submittedAt)}
              </p>
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">İş Geçmişi</h3>
            <ul className="space-y-2 rounded-lg border bg-muted/10 p-3 text-sm">
              {events.map((event, i) => (
                <li
                  key={`${event.type}-${event.at.toISOString()}-${i}`}
                  className="border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{event.title}</span>
                    <time className="text-xs text-muted-foreground">
                      {formatDate(event.at)}
                    </time>
                  </div>
                  {event.detail && (
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {event.detail}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3 border-t pt-4">
          {role === "INTERN" && <TaskInternActions task={task} />}
          {isAdmin && <TaskAdminActions task={task} />}
          {isAdmin && <TaskDeleteForm taskId={task.id} onDeleted={onClose} />}
        </div>
      </div>
    </Modal>
  );
}
