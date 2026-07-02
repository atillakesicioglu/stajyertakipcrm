"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
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

function AssignedCell({
  assignment,
  canClick,
}: {
  assignment: OfficeAssignmentCell;
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
      <td className="bg-red-500/25 px-2 py-3 text-center dark:bg-red-950/50">
        <span className="text-sm font-semibold text-red-700 dark:text-red-400">
          ✓
        </span>
      </td>
    );
  }

  if (canClick) {
    return (
      <td
        className={cn(
          "cursor-pointer px-2 py-3 text-center transition-colors hover:bg-muted/60",
          isPending && "opacity-60"
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Görevi tamamla"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {isPending ? (
          <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
        ) : (
          <span className="text-sm font-medium text-foreground">●</span>
        )}
      </td>
    );
  }

  return (
    <td className="px-2 py-3 text-center">
      <span className="text-sm text-muted-foreground">●</span>
    </td>
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
          Bugün{" "}
          <strong>
            {completedCount}/{totalCount}
          </strong>{" "}
          görev tamamlandı.
          {!isAdmin &&
            " Kendi görevinizin altındaki noktaya tıklayın — kırmızı olunca tamamlanmış demektir."}
        </p>
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
                  className="min-w-[90px] px-2 py-2 text-center align-top font-normal"
                >
                  <div className="font-semibold">{task.title}</div>
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
                      intern.id === currentUserId && "text-primary"
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
                        <td key={task.id} className="px-2 py-3 text-center">
                          <span className="text-muted-foreground/25">·</span>
                        </td>
                      );
                    }

                    const canClick =
                      !isAdmin && intern.id === currentUserId;

                    return (
                      <AssignedCell
                        key={task.id}
                        assignment={assignment}
                        canClick={canClick}
                      />
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
