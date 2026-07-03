"use client";

import { useState } from "react";
import {
  CalendarClock,
  User,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIORITY_BADGE, PRIORITY_LABELS } from "@/lib/constants";
import type { TaskStatus } from "@prisma/client";
import type { BadgeVariant } from "@/lib/app-settings-defaults";
import { formatDateOnly } from "@/lib/utils";
import type { TaskData } from "@/lib/types";
import { TaskDetailModal } from "@/components/task-detail-modal";

const STATUS_PROGRESS: Record<TaskStatus, number> = {
  ASSIGNED: 10,
  IN_PROGRESS: 40,
  SUBMITTED: 70,
  REVISION_REQUESTED: 50,
  APPROVED: 100,
};

export function KanbanTaskCard({
  task,
  role,
  statusLabels,
  statusBadges,
  onOpenDetail,
}: {
  task: TaskData;
  role: "ADMIN" | "INTERN";
  statusLabels: Record<TaskStatus, string>;
  statusBadges: Record<TaskStatus, BadgeVariant>;
  onOpenDetail?: (task: TaskData) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const progress = STATUS_PROGRESS[task.status];
  const latestRevision = task.revisions[0];
  const openDetail = onOpenDetail ?? (() => setLocalOpen(true));

  return (
    <>
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold leading-snug">{task.title}</h3>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-3.5" />
            </div>
            <span>{task.assignedTo.name}</span>
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {formatDateOnly(task.dueDate)}
            </div>
          )}

          <Badge variant={PRIORITY_BADGE[task.priority]} className="text-[10px]">
            {PRIORITY_LABELS[task.priority]}
          </Badge>

          <p className="line-clamp-2 text-xs text-muted-foreground">
            {task.description}
          </p>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>İlerleme</span>
              <span>%{progress}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {task.status === "REVISION_REQUESTED" && latestRevision && (
            <p className="line-clamp-2 text-xs text-destructive">
              {latestRevision.note}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => openDetail(task)}
        >
          <Eye className="size-3.5" />
          Detay Gör
        </Button>
      </div>

      {!onOpenDetail && (
        <TaskDetailModal
          task={task}
          open={localOpen}
          onClose={() => setLocalOpen(false)}
          role={role}
          statusLabels={statusLabels}
          statusBadges={statusBadges}
        />
      )}
    </>
  );
}
