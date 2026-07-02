"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toggleOfficeAssignment } from "@/lib/actions/office-tasks";
import { cn } from "@/lib/utils";

export type OfficeTaskCol = {
  id: string;
  title: string;
};

export type OfficeInternRow = {
  id: string;
  name: string;
};

export type OfficeAssignmentCell = {
  id: string;
  userId: string;
  officeTaskId: string;
  completed: boolean;
  completedAt: Date | null;
};

type Props = {
  todayLabel: string;
  tasks: OfficeTaskCol[];
  interns: OfficeInternRow[];
  assignments: OfficeAssignmentCell[];
  currentUserId: string;
  isAdmin: boolean;
};

function TaskCell({
  assignment,
  isOwnRow,
  canClick,
}: {
  assignment: OfficeAssignmentCell;
  isOwnRow: boolean;
  canClick: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(assignment.completed);

  function handleClick() {
    if (!canClick || isPending || completed) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", assignment.id);
      const result = await toggleOfficeAssignment(fd);
      if (result.ok) setCompleted(true);
    });
  }

  if (completed) {
    return (
      <div
        className={cn(
          "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border border-red-300 bg-red-500/20 px-2 py-2 text-center",
          "text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
        )}
      >
        <CheckCircle2 className="size-4 shrink-0" />
        <span className="text-xs font-semibold">Yapıldı</span>
      </div>
    );
  }

  if (isOwnRow && canClick) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-primary/40",
          "bg-primary/5 px-2 py-2 text-center transition-colors",
          "hover:border-primary hover:bg-primary/10",
          "disabled:cursor-wait disabled:opacity-60"
        )}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-primary" />
        ) : (
          <>
            <span className="text-xs font-semibold text-primary">Göreviniz</span>
            <span className="text-[11px] text-muted-foreground">
              Tamamladıysanız tıklayın
            </span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex min-h-[52px] items-center justify-center rounded-md bg-muted/40 px-2 py-2 text-center">
      <span className="text-xs text-muted-foreground">Bekliyor</span>
    </div>
  );
}

export function OfficeTasksBoard({
  todayLabel,
  tasks,
  interns,
  assignments,
  currentUserId,
  isAdmin,
}: Props) {
  const assignmentMap = useMemo(() => {
    const map = new Map<string, OfficeAssignmentCell>();
    for (const a of assignments) {
      map.set(`${a.userId}:${a.officeTaskId}`, a);
    }
    return map;
  }, [assignments]);

  const completedCount = assignments.filter((a) => a.completed).length;
  const totalCount = assignments.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ofis İşleri</h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Her gün görevler stajyerler arasında döner — bugün{" "}
          <strong>
            {completedCount}/{totalCount}
          </strong>{" "}
          görev tamamlandı.
        </p>
        {!isAdmin && (
          <p className="mt-2 text-sm text-muted-foreground">
            Sadece kendi görevinizin hücresine tıklayarak tamamladığınızı
            işaretleyebilirsiniz.
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="sticky left-0 z-10 min-w-[120px] border-r bg-muted/30 px-4 py-3 text-left font-semibold">
                Stajyer
              </th>
              {tasks.map((task) => (
                <th
                  key={task.id}
                  className="min-w-[100px] px-3 py-3 text-center font-semibold"
                >
                  {task.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {interns.length === 0 ? (
              <tr>
                <td
                  colSpan={tasks.length + 1}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Henüz stajyer kaydı yok.
                </td>
              </tr>
            ) : (
              interns.map((intern) => (
                <tr key={intern.id} className="border-b last:border-b-0">
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-r bg-card px-4 py-3 font-medium",
                      intern.id === currentUserId &&
                        "bg-primary/5 text-primary"
                    )}
                  >
                    {intern.name}
                    {intern.id === currentUserId && !isAdmin && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (siz)
                      </span>
                    )}
                  </td>
                  {tasks.map((task) => {
                    const assignment = assignmentMap.get(
                      `${intern.id}:${task.id}`
                    );

                    if (!assignment) {
                      return (
                        <td key={task.id} className="px-2 py-2">
                          <div className="flex min-h-[52px] items-center justify-center text-muted-foreground/40">
                            —
                          </div>
                        </td>
                      );
                    }

                    const isOwnRow = intern.id === currentUserId;
                    const canClick = !isAdmin && isOwnRow;

                    return (
                      <td key={task.id} className="px-2 py-2">
                        <TaskCell
                          assignment={assignment}
                          isOwnRow={isOwnRow}
                          canClick={canClick}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border-2 border-dashed border-primary/40 bg-primary/5" />
          <span>Sizin göreviniz — tıklayarak tamamlayın</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border border-red-300 bg-red-500/20" />
          <span>Tamamlandı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-muted/40" />
          <span>Başkasının görevi — tıklanamaz</span>
        </div>
      </div>
    </div>
  );
}
