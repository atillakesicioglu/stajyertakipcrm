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
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import {
  assignOfficeTask,
  unassignOfficeTask,
  toggleOfficeAssignment,
} from "@/lib/actions/office-tasks";
import {
  createIntern,
  deleteIntern,
  type ActionResult,
} from "@/lib/actions/interns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

export type OfficeTaskCol = { id: string; title: string };
export type OfficeInternRow = { id: string; name: string; email: string };
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

function CreateInternButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
      Ekle
    </Button>
  );
}

function AdminInternPanel({ interns }: { interns: OfficeInternRow[] }) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    createIntern,
    undefined
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  const confirmIntern = interns.find((i) => i.id === confirmId);

  function handleDelete() {
    if (!confirmId) return;
    const fd = new FormData();
    fd.set("id", confirmId);
    startDelete(async () => {
      await deleteIntern(fd);
      setConfirmId(null);
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Stajyerler</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <UserPlus />
          Stajyer Ekle
        </Button>
      </div>
      {interns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Henüz stajyer yok. Görev atamak için önce stajyer ekleyin.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {interns.map((intern) => (
            <div
              key={intern.id}
              className="flex items-center gap-1 rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
            >
              <span className="font-medium">{intern.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setConfirmId(intern.id)}
                aria-label={`${intern.name} sil`}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Yeni Stajyer"
        description="Stajyer ilk girişinde kendi şifresini belirleyecektir."
      >
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ad Soyad</Label>
            <Input id="name" name="name" required placeholder="Aslı Yılmaz" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="asli@firma.com"
            />
          </div>
          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <CreateInternButton />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Stajyeri Kaldır"
        description={
          confirmIntern
            ? `${confirmIntern.name} (${confirmIntern.email}) kalıcı olarak silinecek.`
            : ""
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmId(null)} disabled={isDeleting}>
            İptal
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Kaldır
          </Button>
        </div>
      </Modal>
    </div>
  );
}

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

function WeekDaySection({
  day,
  tasks,
  interns,
  assignmentMap,
  isAdmin,
  currentUserId,
}: {
  day: WeekDayInfo;
  tasks: OfficeTaskCol[];
  interns: OfficeInternRow[];
  assignmentMap: Map<string, OfficeAssignmentCell>;
  isAdmin: boolean;
  currentUserId: string;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div
        className={cn(
          "border-b px-4 py-3",
          day.isToday && "bg-primary/5"
        )}
      >
        <h2 className="font-semibold">
          {day.label}
          {day.isToday && (
            <span className="ml-2 text-xs font-normal text-primary">(bugün)</span>
          )}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="min-w-[110px] px-4 py-2 text-left font-medium">
                Stajyer
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
            {interns.length === 0 ? (
              <tr>
                <td
                  colSpan={tasks.length + 1}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Stajyer ekleyin.
                </td>
              </tr>
            ) : (
              interns.map((intern) => (
                <tr key={intern.id} className="border-b last:border-b-0">
                  <td
                    className={cn(
                      "px-4 py-2 font-medium",
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
                      `${day.dateKey}:${intern.id}:${task.id}`
                    );
                    const canClickComplete =
                      !isAdmin && intern.id === currentUserId;

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
              ))
            )}
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

      {isAdmin && <AdminInternPanel interns={interns} />}

      <div className="space-y-4">
        {weekDays.map((day) => (
          <WeekDaySection
            key={day.dateKey}
            day={day}
            tasks={tasks}
            interns={interns}
            assignmentMap={assignmentMap}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
