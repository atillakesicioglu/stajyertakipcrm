"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Play,
  Send,
  Check,
  RotateCcw,
  Loader2,
  CalendarClock,
  MessageSquareWarning,
} from "lucide-react";
import { TaskDeleteInline } from "@/components/task-actions";
import {
  startTask,
  submitTask,
  approveTask,
  requestRevision,
  type TaskActionResult,
} from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  PRIORITY_BADGE,
  PRIORITY_LABELS,
} from "@/lib/constants";
import type { TaskStatus } from "@prisma/client";
import type { BadgeVariant } from "@/lib/app-settings-defaults";
import { formatDateOnly } from "@/lib/utils";
import type { TaskData } from "@/lib/types";
import { TaskTimelineAccordion } from "@/components/task-timeline";

export function TaskCard({
  task,
  role,
  statusLabels,
  statusBadges,
}: {
  task: TaskData;
  role: "ADMIN" | "INTERN";
  statusLabels: Record<TaskStatus, string>;
  statusBadges: Record<TaskStatus, BadgeVariant>;
}) {
  const isIntern = role === "INTERN";
  const isAdmin = role === "ADMIN";
  const latestRevision = task.revisions[task.revisions.length - 1];

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{task.title}</h3>
            <Badge variant={statusBadges[task.status]}>
              {statusLabels[task.status]}
            </Badge>
            <Badge variant={PRIORITY_BADGE[task.priority]}>
              {PRIORITY_LABELS[task.priority]} Öncelik
            </Badge>
          </div>
          {isAdmin && (
            <p className="text-sm text-muted-foreground">
              Atanan: <span className="font-medium">{task.assignedTo.name}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {task.dueDate && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4" />
              Son teslim: {formatDateOnly(task.dueDate)}
            </div>
          )}
          {isAdmin && <TaskDeleteInline taskId={task.id} />}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
        {task.description}
      </p>

      {task.status === "REVISION_REQUESTED" && latestRevision && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <MessageSquareWarning className="size-4" />
            Güncel Revize Notu
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{latestRevision.note}</p>
        </div>
      )}

      <TaskTimelineAccordion task={task} />

      <div className="mt-4 border-t pt-4">
        {isIntern && <InternActions task={task} />}
        {isAdmin && task.status === "SUBMITTED" && <AdminReview task={task} />}
        {isAdmin && task.status === "APPROVED" && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="size-4" /> Bu iş onaylandı.
          </p>
        )}
      </div>
    </div>
  );
}

function InternActions({ task }: { task: TaskData }) {
  const canStart =
    task.status === "ASSIGNED" || task.status === "REVISION_REQUESTED";
  const canSubmit = task.status === "IN_PROGRESS";

  if (canStart) {
    return (
      <form action={startTask}>
        <input type="hidden" name="id" value={task.id} />
        <StartButton revision={task.status === "REVISION_REQUESTED"} />
      </form>
    );
  }

  if (canSubmit) {
    return <SubmitForm taskId={task.id} />;
  }

  if (task.status === "SUBMITTED") {
    return (
      <p className="text-sm text-muted-foreground">
        Teslim edildi, yönetici onayı bekleniyor.
      </p>
    );
  }

  if (task.status === "APPROVED") {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="size-4" /> Bu iş onaylandı.
      </p>
    );
  }

  return null;
}

function StartButton({ revision }: { revision: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Play />}
      {revision ? "Yeniden İşe Başla" : "İşe Başladım"}
    </Button>
  );
}

function SubmitForm({ taskId }: { taskId: string }) {
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(submitTask, undefined);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={taskId} />
      <div className="space-y-1.5">
        <Label htmlFor={`text-${taskId}`}>Açıklama</Label>
        <Textarea
          id={`text-${taskId}`}
          name="textContent"
          placeholder="Yaptığınız işi açıklayın (opsiyonel)"
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`file-${taskId}`}>Ekran Görüntüsü (PNG, JPG, WEBP)</Label>
        <input
          id={`file-${taskId}`}
          name="screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/80"
        />
        {fileName && (
          <p className="text-xs text-muted-foreground">Seçilen: {fileName}</p>
        )}
      </div>
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitTaskButton />
    </form>
  );
}

function SubmitTaskButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Send />}
      İşi Teslim Et
    </Button>
  );
}

function AdminReview({ task }: { task: TaskData }) {
  const [showRevision, setShowRevision] = useState(false);
  const [approveState, approveAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(approveTask, undefined);
  const [revisionState, revisionAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(requestRevision, undefined);

  useEffect(() => {
    if (revisionState?.ok) setShowRevision(false);
  }, [revisionState]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={approveAction}>
          <input type="hidden" name="id" value={task.id} />
          <ApproveButton />
        </form>
        {approveState?.error && (
          <p className="w-full rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {approveState.error}
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => setShowRevision((v) => !v)}
        >
          <RotateCcw />
          Revize İste
        </Button>
      </div>

      {showRevision && (
        <form action={revisionAction} className="space-y-2">
          <input type="hidden" name="id" value={task.id} />
          <Textarea
            name="note"
            placeholder="Neyin düzeltilmesi gerektiğini yazın..."
            rows={3}
            required
          />
          {revisionState?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {revisionState.error}
            </p>
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
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Check />}
      Onayla
    </Button>
  );
}

function RevisionButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      Revize Gönder
    </Button>
  );
}
