"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import {
  Play,
  Send,
  Check,
  RotateCcw,
  Loader2,
  CalendarClock,
  Paperclip,
  MessageSquareWarning,
} from "lucide-react";
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
  STATUS_BADGE,
  STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateOnly } from "@/lib/utils";
import type { TaskData } from "@/lib/types";

export function TaskCard({
  task,
  role,
}: {
  task: TaskData;
  role: "ADMIN" | "INTERN";
}) {
  const isIntern = role === "INTERN";
  const isAdmin = role === "ADMIN";
  const latestRevision = task.revisions[0];

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{task.title}</h3>
            <Badge variant={STATUS_BADGE[task.status]}>
              {STATUS_LABELS[task.status]}
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
        {task.dueDate && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            Son teslim: {formatDateOnly(task.dueDate)}
          </div>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
        {task.description}
      </p>

      {task.status === "REVISION_REQUESTED" && latestRevision && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <MessageSquareWarning className="size-4" />
            Revize Notu
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{latestRevision.note}</p>
        </div>
      )}

      {task.submissions.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Teslimler
          </p>
          {task.submissions.map((s) => (
            <div key={s.id} className="rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground">
                {formatDate(s.submittedAt)}
              </p>
              {s.textContent && (
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {s.textContent}
                </p>
              )}
              {s.screenshotUrl && (
                <a
                  href={s.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block"
                >
                  <Image
                    src={s.screenshotUrl}
                    alt={s.screenshotName ?? "Ekran görüntüsü"}
                    width={320}
                    height={200}
                    className="max-h-48 w-auto rounded-md border object-contain"
                    unoptimized
                  />
                  <span className="mt-1 flex items-center gap-1 text-xs text-primary">
                    <Paperclip className="size-3" />
                    {s.screenshotName ?? "Ekran görüntüsü"}
                  </span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {task.revisions.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Revize Geçmişi ({task.revisions.length})
          </summary>
          <div className="mt-2 space-y-2">
            {task.revisions.map((r) => (
              <div key={r.id} className="rounded-md border bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(r.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{r.note}</p>
              </div>
            ))}
          </div>
        </details>
      )}

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
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(requestRevision, undefined);

  useEffect(() => {
    if (state?.ok) setShowRevision(false);
  }, [state]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={approveTask}>
          <input type="hidden" name="id" value={task.id} />
          <ApproveButton />
        </form>
        <Button
          variant="outline"
          onClick={() => setShowRevision((v) => !v)}
        >
          <RotateCcw />
          Revize İste
        </Button>
      </div>

      {showRevision && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="id" value={task.id} />
          <Textarea
            name="note"
            placeholder="Neyin düzeltilmesi gerektiğini yazın..."
            rows={3}
            required
          />
          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
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
