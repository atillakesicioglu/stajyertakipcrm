"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  assignOfficeTask,
  unassignOfficeTask,
  toggleOfficeAssignment,
} from "@/lib/actions/office-tasks";
import { cn } from "@/lib/utils";

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

function DayCell({
  assignment,
  isAdmin,
  isToday,
  canClickComplete,
  userId,
  officeTaskId,
  dateKey,
}: {
  assignment: OfficeAssignmentCell | undefined;
  isAdmin: boolean;
  isToday: boolean;
  canClickComplete: boolean;
  userId: string;
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
    if (!assignment || !canClickComplete || isPending || completed) return;
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

  function handleAdminClick() {
    if (isPending) return;
    startTransition(async () => {
      if (assignment) {
        const fd = new FormData();
        fd.set("id", assignment.id);
        const result = await unassignOfficeTask(fd);
        if (result.ok) router.refresh();
        return;
      }

      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("officeTaskId", officeTaskId);
      fd.set("date", dateKey);
      const result = await assignOfficeTask(fd);
      if (result.ok) router.refresh();
    });
  }

  if (completed) {
    return (
      <td className="bg-red-500/25 px-2 py-2.5 text-center dark:bg-red-950/50">
        <span className="text-sm font-semibold text-red-700 dark:text-red-400">
          ✓
        </span>
      </td>
    );
  }

  if (assignment) {
    if (canClickComplete && isToday) {
      return (
        <td
          className={cn(
            "cursor-pointer px-2 py-2.5 text-center transition-colors hover:bg-muted/60",
            isPending && "opacity-60"
          )}
          onClick={handleInternClick}
          role="button"
          tabIndex={0}
          aria-label="Görevi tamamla"
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
            <span className="text-sm font-medium">●</span>
          )}
        </td>
      );
    }

    if (isAdmin) {
      return (
        <td
          className={cn(
            "cursor-pointer px-2 py-2.5 text-center transition-colors hover:bg-muted/60",
            isPending && "opacity-60"
          )}
          onClick={handleAdminClick}
          role="button"
          tabIndex={0}
          title="Atamayı kaldır"
        >
          {isPending ? (
            <Loader2 className="mx-auto size-4 animate-spin" />
          ) : (
            <span className="text-sm font-medium">●</span>
          )}
        </td>
      );
    }

    return (
      <td className="px-2 py-2.5 text-center">
        <span className="text-sm text-muted-foreground">●</span>
      </td>
    );
  }

  if (isAdmin) {
    return (
      <td
        className={cn(
          "cursor-pointer px-2 py-2.5 text-center text-muted-foreground/30 transition-colors hover:bg-muted/40 hover:text-muted-foreground",
          isPending && "opacity-60"
        )}
        onClick={handleAdminClick}
        role="button"
        tabIndex={0}
        title="Görev ata"
      >
        {isPending ? (
          <Loader2 className="mx-auto size-4 animate-spin" />
        ) : (
          "·"
        )}
      </td>
    );
  }

  return (
    <td className="px-2 py-2.5 text-center text-muted-foreground/25">·</td>
  );
}

function InternSection({
  intern,
  weekDays,
  tasks,
  assignmentMap,
  isAdmin,
  currentUserId,
}: {
  intern: OfficeInternRow;
  weekDays: WeekDayInfo[];
  tasks: OfficeTaskCol[];
  assignmentMap: Map<string, OfficeAssignmentCell>;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const isOwn = intern.id === currentUserId;

  return (
    <div className="rounded-lg border bg-card">
      <div
        className={cn(
          "border-b px-4 py-3",
          isOwn && !isAdmin && "bg-primary/5"
        )}
      >
        <h2 className={cn("font-semibold", isOwn && "text-primary")}>
          {intern.name}
          {isOwn && !isAdmin && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (siz)
            </span>
          )}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="min-w-[130px] px-4 py-2 text-left font-medium">
                Gün
              </th>
              {tasks.map((task) => (
                <th
                  key={task.id}
                  className="min-w-[72px] px-2 py-2 text-center font-medium"
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
                <td className="px-4 py-2 text-muted-foreground">
                  {day.label}
                  {day.isToday && (
                    <span className="ml-1.5 text-xs text-primary">(bugün)</span>
                  )}
                </td>
                {tasks.map((task) => {
                  const assignment = assignmentMap.get(
                    `${day.dateKey}:${intern.id}:${task.id}`
                  );
                  const canClickComplete = !isAdmin && isOwn;

                  return (
                    <DayCell
                      key={task.id}
                      assignment={assignment}
                      isAdmin={isAdmin}
                      isToday={day.isToday}
                      canClickComplete={canClickComplete}
                      userId={intern.id}
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

export function OfficeTasksBoard({
  weekDays,
  tasks,
  interns,
  assignments,
  currentUserId,
  isAdmin,
}: Props) {
  const assignmentMap = useMemo(() => {
    const map = new Map<string, OfficeAssignmentCell>();
    for (const a of assignments) {
      map.set(`${a.dateKey}:${a.userId}:${a.officeTaskId}`, a);
    }
    return map;
  }, [assignments]);

  const todayAssignments = assignments.filter(
    (a) => weekDays.find((d) => d.isToday && d.dateKey === a.dateKey)
  );
  const completedToday = todayAssignments.filter((a) => a.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ofis İşleri</h1>
        <p className="text-sm text-muted-foreground">
          Bu haftanın görev planı — Pazartesi&apos;den Cuma&apos;ya.
          {weekDays.some((d) => d.isToday) && (
            <>
              {" "}
              Bugün{" "}
              <strong>
                {completedToday}/{todayAssignments.length}
              </strong>{" "}
              görev tamamlandı.
            </>
          )}
        </p>
        {isAdmin ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Hücreye tıklayarak görev atayın; atanan hücreye tekrar tıklayarak
            kaldırın.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Bugünkü kendi görevinizin altındaki noktaya tıklayın — kırmızı olunca
            tamamlanmış demektir.
          </p>
        )}
      </div>

      {interns.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-10 text-center text-muted-foreground">
          Henüz stajyer kaydı yok.
        </div>
      ) : (
        <div className="space-y-4">
          {interns.map((intern) => (
            <InternSection
              key={intern.id}
              intern={intern}
              weekDays={weekDays}
              tasks={tasks}
              assignmentMap={assignmentMap}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
