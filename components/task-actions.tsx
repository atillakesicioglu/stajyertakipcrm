"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Play,
  Send,
  Check,
  RotateCcw,
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { TaskData } from "@/lib/types";

type ActionSuccessHandler = (result: TaskActionResult) => void;

function useActionSuccess(
  state: TaskActionResult | undefined,
  onSuccess?: ActionSuccessHandler
) {
  useEffect(() => {
    if (state?.ok) onSuccess?.(state);
  }, [state, onSuccess]);
}

function StartTaskForm({
  task,
  onActionSuccess,
}: {
  task: TaskData;
  onActionSuccess?: ActionSuccessHandler;
}) {
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(startTask, undefined);

  useActionSuccess(state, onActionSuccess);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={task.id} />
      {state?.error && (
        <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <FormSubmitButton
        label={
          task.status === "REVISION_REQUESTED" ? "Yeniden Başla" : "İşe Başladım"
        }
        icon={Play}
        className="w-full"
        size="sm"
      />
    </form>
  );
}

export function TaskInternActions({
  task,
  onActionSuccess,
}: {
  task: TaskData;
  onActionSuccess?: ActionSuccessHandler;
}) {
  if (task.status === "ASSIGNED" || task.status === "REVISION_REQUESTED") {
    return <StartTaskForm task={task} onActionSuccess={onActionSuccess} />;
  }

  if (task.status === "IN_PROGRESS") {
    return <TaskSubmitForm taskId={task.id} onActionSuccess={onActionSuccess} />;
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

function TaskSubmitForm({
  taskId,
  onActionSuccess,
}: {
  taskId: string;
  onActionSuccess?: ActionSuccessHandler;
}) {
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(submitTask, undefined);

  useActionSuccess(state, onActionSuccess);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={taskId} />
      <div className="space-y-1.5">
        <Label htmlFor={`detail-text-${taskId}`}>Teslim Açıklaması</Label>
        <Textarea
          id={`detail-text-${taskId}`}
          name="textContent"
          placeholder="Yaptığınız işi açıklayın (opsiyonel)"
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`detail-file-${taskId}`}>Ekran Görüntüsü</Label>
        <input
          id={`detail-file-${taskId}`}
          name="screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </div>
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <FormSubmitButton label="İşi Teslim Et" icon={Send} className="w-full" size="sm" />
    </form>
  );
}

export function TaskAdminActions({
  task,
  onActionSuccess,
}: {
  task: TaskData;
  onActionSuccess?: ActionSuccessHandler;
}) {
  const [showRevision, setShowRevision] = useState(false);
  const [approveState, approveAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(approveTask, undefined);
  const [revisionState, revisionAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(requestRevision, undefined);

  useActionSuccess(approveState, onActionSuccess);
  useActionSuccess(revisionState, (result) => {
    if (result.ok) setShowRevision(false);
    onActionSuccess?.(result);
  });

  if (task.status === "SUBMITTED") {
    return (
      <div className="space-y-3">
        <form action={approveAction}>
          <input type="hidden" name="id" value={task.id} />
          {approveState?.error && (
            <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {approveState.error}
            </p>
          )}
          <FormSubmitButton label="Onayla" icon={Check} className="w-full" size="sm" />
        </form>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowRevision((v) => !v)}
        >
          <RotateCcw className="size-4" />
          Revize İste
        </Button>
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
            <FormSubmitButton
              label="Revize Gönder"
              icon={RotateCcw}
              variant="destructive"
              className="w-full"
              size="sm"
            />
          </form>
        )}
      </div>
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

export function TaskDeleteInline({ taskId }: { taskId: string }) {
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(deleteTask, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={taskId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive -mr-2"
      >
        <Trash2 className="size-3.5 mr-1.5" />
        {state?.error ? "Hata" : "İşi Sil"}
      </Button>
    </form>
  );
}

export function TaskDeleteForm({
  taskId,
  onDeleted,
}: {
  taskId: string;
  onDeleted?: ActionSuccessHandler;
}) {
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(deleteTask, undefined);

  useActionSuccess(state, onDeleted);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={taskId} />
      {state?.error && (
        <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <FormSubmitButton
        label="İşi Sil"
        pendingLabel="Siliniyor..."
        icon={Trash2}
        variant="ghost"
        size="sm"
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
      />
    </form>
  );
}
