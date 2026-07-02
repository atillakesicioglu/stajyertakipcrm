"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  assignOfficeTask,
  unassignOfficeTask,
  toggleOfficeAssignment,
  createOfficeTask,
  deleteOfficeTask,
  type OfficeActionResult,
} from "@/lib/actions/office-tasks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

export type OfficeTaskCol = { id: string; title: string };
export type OfficeInternRow = { id: string; name: string };
export type WeekDayInfo = { dateKey: string; label: string; isToday: boolean };

export type OfficeAssignmentCell = {
  id: string;
  userId: string;
  officeTaskId: string;
  dateKey: string;
  completed: boolean;
};

type Props = {
  weekDays: WeekDayInfo[];
  tasks: OfficeTaskCol[];
  interns: OfficeInternRow[];
  assignments: OfficeAssignmentCell[];
  currentUserId: string;
  isAdmin: boolean;
};

function SubmitButton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Plus;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Icon />}
      {label}
    </Button>
  );
}

function TaskCell({
  assignment,
  internName,
  isAdmin,
  isToday,
  isOwn,
  interns,
  officeTaskId,
  dateKey,
}: {
  assignment: OfficeAssignmentCell | undefined;
  internName: string | undefined;
  isAdmin: boolean;
  isToday: boolean;
  isOwn: boolean;
  interns: OfficeInternRow[];
  officeTaskId: string;
  dateKey: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(assignment?.completed ?? false);

  useEffect(() => {
    setCompleted(assignment?.completed ?? false);
  }, [assignment]);

  function handleInternClick() {
    if (!assignment || !isOwn || !isToday || isPending || completed) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", assignment.id);
      const result = await toggleOfficeAssignment(fd);
      if (result.ok) {
        setCompleted(true);
        router.refresh();
      }
    });
  }

  function handleAdminChange(userId: string) {
    startTransition(async () => {
      if (!userId) {
        if (!assignment) return;
        const fd = new FormData();
        fd.set("id", assignment.id);
        await unassignOfficeTask(fd);
      } else {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("officeTaskId", officeTaskId);
        fd.set("date", dateKey);
        await assignOfficeTask(fd);
      }
      router.refresh();
    });
  }

  if (isAdmin) {
    const hasAssignment = !!assignment?.userId;
    return (
      <td
        className={cn(
          "px-2 py-2 align-top",
          hasAssignment &&
            (assignment.completed
              ? "bg-green-500/25 dark:bg-green-950/50"
              : "bg-red-500/25 dark:bg-red-950/50")
        )}
      >
        <select
          className="w-full min-w-[88px] rounded-md border bg-background px-2 py-1.5 text-sm"
          value={assignment?.userId ?? ""}
          disabled={isPending}
          onChange={(e) => handleAdminChange(e.target.value)}
        >
          <option value="">—</option>
          {interns.map((intern) => (
            <option key={intern.id} value={intern.id}>
              {intern.name}
            </option>
          ))}
        </select>
      </td>
    );
  }

  if (!internName) {
    return (
      <td className="px-2 py-2.5 text-center text-muted-foreground/30">—</td>
    );
  }

  if (completed) {
    return (
      <td className="bg-green-500/25 px-2 py-2.5 text-center dark:bg-green-950/50">
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
          {internName} ✓
        </span>
      </td>
    );
  }

  if (isOwn && isToday) {
    return (
      <td
        className={cn(
          "cursor-pointer bg-red-500/25 px-2 py-2.5 text-center transition-colors hover:bg-red-500/35 dark:bg-red-950/50 dark:hover:bg-red-950/65",
          isPending && "opacity-60"
        )}
        onClick={handleInternClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleInternClick();
          }
        }}
      >
        {isPending ? (
          <Loader2 className="mx-auto size-4 animate-spin" />
        ) : (
          <span className="text-sm font-semibold text-red-700 dark:text-red-400">
            {internName}
          </span>
        )}
      </td>
    );
  }

  return (
    <td className="bg-red-500/25 px-2 py-2.5 text-center dark:bg-red-950/50">
      <span className="text-sm font-semibold text-red-700 dark:text-red-400">
        {internName}
      </span>
    </td>
  );
}

function AdminToolbar({
  tasks,
  onTaskDeleted,
}: {
  tasks: OfficeTaskCol[];
  onTaskDeleted: (taskId: string) => void;
}) {
  const router = useRouter();
  const [taskOpen, setTaskOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const [taskState, taskAction] = useActionState<
    OfficeActionResult | undefined,
    FormData
  >(createOfficeTask, undefined);

  useEffect(() => {
    if (taskState?.ok) {
      setTaskOpen(false);
      router.refresh();
    }
  }, [taskState, router]);

  const confirmTask = tasks.find((t) => t.id === confirmTaskId);

  function handleDeleteTask() {
    if (!confirmTaskId) return;
    const taskId = confirmTaskId;
    setConfirmTaskId(null);
    onTaskDeleted(taskId);

    startDelete(async () => {
      const fd = new FormData();
      fd.set("id", taskId);
      const result = await deleteOfficeTask(fd);
      if (!result.ok) {
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>
          <Plus />
          Yeni Görev
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setManageOpen(true)}>
          Yönet
        </Button>
      </div>

      <Modal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Yeni Günlük Görev"
        description="Tabloya yeni bir ofis işi sütunu eklenir."
      >
        <form action={taskAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Görev Adı</Label>
            <Input
              id="task-title"
              name="title"
              required
              placeholder="Örn: Mutfak"
            />
          </div>
          {taskState?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {taskState.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>
              İptal
            </Button>
            <SubmitButton label="Ekle" icon={Plus} />
          </div>
        </form>
      </Modal>

      <Modal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Günlük Görevler"
        description="Silmek istediğiniz görevin yanındaki çöp kutusuna tıklayın."
      >
        <ul className="space-y-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              {task.title}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setConfirmTaskId(task.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={!!confirmTaskId}
        onClose={() => setConfirmTaskId(null)}
        title="Görevi Sil"
        description={
          confirmTask ? `"${confirmTask.title}" kalıcı olarak silinecek.` : ""
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmTaskId(null)} disabled={isDeleting}>
            İptal
          </Button>
          <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Sil
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function OfficeTasksBoard({
  weekDays,
  tasks: initialTasks,
  interns,
  assignments,
  currentUserId,
  isAdmin,
}: Props) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const internNames = useMemo(
    () => new Map(interns.map((i) => [i.id, i.name])),
    [interns]
  );

  const assignmentByDateTask = useMemo(() => {
    const map = new Map<string, OfficeAssignmentCell>();
    for (const a of assignments) {
      map.set(`${a.dateKey}:${a.officeTaskId}`, a);
    }
    return map;
  }, [assignments]);

  const todayAssignments = assignments.filter((a) =>
    weekDays.some((d) => d.isToday && d.dateKey === a.dateKey)
  );
  const completedToday = todayAssignments.filter((a) => a.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ofis İşleri</h1>
          <p className="text-sm text-muted-foreground">
            Haftalık görev planı — atamalar otomatik oluşturulur, stajyerler günler arasında farklı işlere döner.
            {weekDays.some((d) => d.isToday) && (
              <>
                {" "}
                Bugün{" "}
                <strong>
                  {completedToday}/{todayAssignments.length}
                </strong>{" "}
                tamamlandı.
              </>
            )}
          </p>
          {!isAdmin && (
            <p className="mt-1 text-sm text-muted-foreground">
              Bugün adınızın yazılı olduğu kırmızı hücreye tıklayın — yeşil olunca
              tamamlanmış demektir.
            </p>
          )}
        </div>
        {isAdmin && (
          <AdminToolbar
            tasks={tasks}
            onTaskDeleted={(taskId) => {
              setTasks((prev) => prev.filter((t) => t.id !== taskId));
            }}
          />
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="min-w-[130px] px-4 py-3 text-left font-semibold">
                Gün
              </th>
              {tasks.map((task) => (
                <th
                  key={task.id}
                  className="min-w-[100px] px-2 py-3 text-center font-semibold"
                >
                  {task.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDays.map((day) => (
              <tr
                key={day.dateKey}
                className={cn(
                  "border-b last:border-b-0",
                  day.isToday && "bg-primary/[0.03]"
                )}
              >
                <td className="px-4 py-2.5 align-top font-medium text-muted-foreground">
                  {day.label}
                  {day.isToday && (
                    <span className="ml-1.5 text-xs text-primary">(bugün)</span>
                  )}
                </td>
                {tasks.map((task) => {
                  const assignment = assignmentByDateTask.get(
                    `${day.dateKey}:${task.id}`
                  );
                  const internName = assignment
                    ? internNames.get(assignment.userId)
                    : undefined;

                  return (
                    <TaskCell
                      key={task.id}
                      assignment={assignment}
                      internName={internName}
                      isAdmin={isAdmin}
                      isToday={day.isToday}
                      isOwn={assignment?.userId === currentUserId}
                      interns={interns}
                      officeTaskId={task.id}
                      dateKey={day.dateKey}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
