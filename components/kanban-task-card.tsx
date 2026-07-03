"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Play,
  Send,
  Check,
  RotateCcw,
  Loader2,
  CalendarClock,
  User,
  Trash2,
} from "lucide-react";
import {
  startTask,
  submitTask,
  approveTask,
  requestRevision,
  deleteTask,
  type TaskActionResult,
} from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_BADGE, PRIORITY_LABELS } from "@/lib/constants";
import type { TaskStatus } from "@prisma/client";
import type { BadgeVariant } from "@/lib/app-settings-defaults";
import { formatDateOnly } from "@/lib/utils";
import type { TaskData } from "@/lib/types";

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
}: {
  task: TaskData;
  role: "ADMIN" | "INTERN";
  statusLabels: Record<TaskStatus, string>;
  statusBadges: Record<TaskStatus, BadgeVariant>;
}) {
  const isAdmin = role === "ADMIN";
  const isIntern = role === "INTERN";
  const progress = STATUS_PROGRESS[task.status];
  const latestRevision = task.revisions[task.revisions.length - 1];

  return (
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

      <div className="mt-3 border-t pt-3">
        {isIntern && <InternActions task={task} />}
        {isAdmin && task.status === "SUBMITTED" && <AdminReview task={task} />}
        {isAdmin && task.status === "APPROVED" && (
          <p className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-3.5" /> Onaylandı
          </p>
        )}
        {isAdmin && (
          <form action={deleteTask} className="mt-2">
            <input type="hidden" name="id" value={task.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-7 w-full text-xs text-destructive"
            >
              <Trash2 className="size-3.5" /> Sil
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function InternActions({ task }: { task: TaskData }) {
  if (task.status === "ASSIGNED" || task.status === "REVISION_REQUESTED") {
    return (
      <form action={startTask}>
        <input type="hidden" name="id" value={task.id} />
        <StartButton revision={task.status === "REVISION_REQUESTED"} />
      </form>
    );
  }
  if (task.status === "IN_PROGRESS") {
    return <SubmitForm taskId={task.id} />;
  }
  if (task.status === "SUBMITTED") {
    return (
      <p className="text-xs text-muted-foreground">Onay bekleniyor</p>
    );
  }
  if (task.status === "APPROVED") {
    return (
      <p className="flex items-center gap-1 text-xs text-emerald-600">
        <Check className="size-3.5" /> Tamamlandı
      </p>
    );
  }
  return null;
}

function StartButton({ revision }: { revision: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Play className="size-3.5" />}
      {revision ? "Yeniden Başla" : "Başladım"}
    </Button>
  );
}

function SubmitForm({ taskId }: { taskId: string }) {
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(submitTask, undefined);
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <Button size="sm" className="w-full" onClick={() => setExpanded(true)}>
        <Send className="size-3.5" /> Teslim Et
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={taskId} />
      <Textarea name="textContent" placeholder="Açıklama" rows={2} className="text-xs" />
      <input
        name="screenshot"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="w-full text-xs"
      />
      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
      <SubmitTaskButton />
    </form>
  );
}

function SubmitTaskButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Send className="size-3.5" />}
      Gönder
    </Button>
  );
}

function AdminReview({ task }: { task: TaskData }) {
  const [showRevision, setShowRevision] = useState(false);
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(requestRevision, undefined);

  useEffect(() => {
    if (state?.ok) setShowRevision(false);
  }, [state]);

  return (
    <div className="space-y-2">
      <form action={approveTask}>
        <input type="hidden" name="id" value={task.id} />
        <ApproveButton />
      </form>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setShowRevision((v) => !v)}
      >
        <RotateCcw className="size-3.5" /> Revize
      </Button>
      {showRevision && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="id" value={task.id} />
          <Textarea name="note" rows={2} required className="text-xs" />
          {state?.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}
          <RevisionButton />
        </form>
      )}
    </div>
  );
}

function ApproveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="mb-2 w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Check className="size-3.5" />}
      Onayla
    </Button>
  );
}

function RevisionButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw className="size-3.5" />}
      Gönder
    </Button>
  );
}
