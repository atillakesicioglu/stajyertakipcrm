"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Trophy,
  AlertCircle,
  Download,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
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
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type OfficeTaskCol = { id: string; title: string };
export type OfficeInternRow = { id: string; name: string };
export type WeekDayInfo = {
  dateKey: string;
  label: string;
  shortLabel: string;
  isToday: boolean;
};

export type OfficeAssignmentCell = {
  id: string;
  userId: string;
  officeTaskId: string;
  dateKey: string;
  completed: boolean;
};

type Props = {
  weekDays: WeekDayInfo[];
  weekRangeLabel: string;
  nextWeekDays: WeekDayInfo[];
  nextWeekRangeLabel: string;
  tasks: OfficeTaskCol[];
  interns: OfficeInternRow[];
  assignments: OfficeAssignmentCell[];
  nextAssignments: OfficeAssignmentCell[];
  currentUserId: string;
  isAdmin: boolean;
};

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 6);
  return `${parts[0]} ${parts[1]!.charAt(0)}.`;
}

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
  preview = false,
}: {
  assignment: OfficeAssignmentCell | undefined;
  internName: string | undefined;
  isAdmin: boolean;
  isToday: boolean;
  isOwn: boolean;
  interns: OfficeInternRow[];
  officeTaskId: string;
  dateKey: string;
  preview?: boolean;
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

  if (preview) {
    return (
      <td className="px-2 py-2.5 text-center">
        <span className="text-sm text-muted-foreground">
          {internName ? shortName(internName) : "—"}
        </span>
      </td>
    );
  }

  if (isAdmin) {
    const hasAssignment = !!assignment?.userId;
    return (
      <td
        className={cn(
          "px-2 py-2 align-top text-center",
          hasAssignment &&
            (assignment.completed
              ? "bg-green-500/25 dark:bg-green-950/50"
              : "bg-red-500/25 dark:bg-red-950/50")
        )}
      >
        <select
          className="mx-auto w-full min-w-[88px] max-w-[110px] rounded-md border bg-background px-2 py-1.5 text-sm"
          value={assignment?.userId ?? ""}
          disabled={isPending}
          onChange={(e) => handleAdminChange(e.target.value)}
        >
          <option value="">—</option>
          {interns.map((intern) => (
            <option key={intern.id} value={intern.id}>
              {shortName(intern.name)}
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

  const display = shortName(internName);

  if (completed) {
    return (
      <td className="bg-green-500/25 px-2 py-2.5 text-center dark:bg-green-950/50">
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
          {display}
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
            {display}
          </span>
        )}
      </td>
    );
  }

  return (
    <td className="bg-red-500/25 px-2 py-2.5 text-center dark:bg-red-950/50">
      <span className="text-sm font-semibold text-red-700 dark:text-red-400">
        {display}
      </span>
    </td>
  );
}

function OfficeTaskGrid({
  weekDays,
  tasks,
  assignments,
  interns,
  internNames,
  currentUserId,
  isAdmin,
  preview = false,
  internFilter,
  taskFilter,
}: {
  weekDays: WeekDayInfo[];
  tasks: OfficeTaskCol[];
  assignments: OfficeAssignmentCell[];
  interns: OfficeInternRow[];
  internNames: Map<string, string>;
  currentUserId: string;
  isAdmin: boolean;
  preview?: boolean;
  internFilter: string;
  taskFilter: string;
}) {
  const assignmentByDateTask = useMemo(() => {
    const map = new Map<string, OfficeAssignmentCell>();
    for (const a of assignments) {
      map.set(`${a.dateKey}:${a.officeTaskId}`, a);
    }
    return map;
  }, [assignments]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === "ALL") return tasks;
    return tasks.filter((t) => t.id === taskFilter);
  }, [tasks, taskFilter]);

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border bg-card",
        preview && "pointer-events-none select-none border-dashed bg-muted/20 opacity-55"
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="min-w-[130px] px-4 py-3 text-left font-semibold">
              Ofis İşi / Gün
            </th>
            {weekDays.map((day) => (
              <th
                key={day.dateKey}
                className={cn(
                  "min-w-[88px] px-2 py-3 text-center font-semibold",
                  !preview && day.isToday && "text-primary"
                )}
              >
                {day.shortLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredTasks.map((task) => (
            <tr key={task.id} className="border-b last:border-b-0">
              <td className="px-4 py-2.5 font-medium">{task.title}</td>
              {weekDays.map((day) => {
                const assignment = assignmentByDateTask.get(
                  `${day.dateKey}:${task.id}`
                );
                const internName = assignment
                  ? internNames.get(assignment.userId)
                  : undefined;

                if (
                  internFilter !== "ALL" &&
                  assignment &&
                  assignment.userId !== internFilter
                ) {
                  return (
                    <td
                      key={day.dateKey}
                      className="px-2 py-2.5 text-center text-muted-foreground/30"
                    >
                      —
                    </td>
                  );
                }

                return (
                  <TaskCell
                    key={day.dateKey}
                    assignment={assignment}
                    internName={internName}
                    isAdmin={isAdmin}
                    isToday={day.isToday}
                    isOwn={assignment?.userId === currentUserId}
                    interns={interns}
                    officeTaskId={task.id}
                    dateKey={day.dateKey}
                    preview={preview}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
  iconBg,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  iconBg: string;
  trend?: { positive: boolean; label: string };
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("rounded-xl p-3", iconBg)}>
          <Icon className={cn("size-6", iconClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-0.5 flex items-center gap-0.5 text-xs font-medium",
                trend.positive ? "text-emerald-600" : "text-red-500"
              )}
            >
              {trend.positive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminToolbar({
  tasks,
  onTaskDeleted,
  onTaskRestored,
}: {
  tasks: OfficeTaskCol[];
  onTaskDeleted: (taskId: string) => void;
  onTaskRestored: (task: OfficeTaskCol) => void;
}) {
  const router = useRouter();
  const [taskOpen, setTaskOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    if (!confirmTaskId || !confirmTask) return;
    const taskId = confirmTaskId;
    const removedTask = confirmTask;
    setConfirmTaskId(null);
    setDeleteError(null);
    onTaskDeleted(taskId);

    startDelete(async () => {
      const fd = new FormData();
      fd.set("id", taskId);
      const result = await deleteOfficeTask(fd);
      if (!result.ok) {
        onTaskRestored(removedTask);
        setDeleteError(result.error ?? "Görev silinemedi.");
        return;
      }
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
        description="Tabloya yeni bir ofis işi satırı eklenir."
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
        onClose={() => {
          setManageOpen(false);
          setDeleteError(null);
        }}
        title="Günlük Görevler"
        description="Silmek istediğiniz görevin yanındaki çöp kutusuna tıklayın."
      >
        {deleteError && (
          <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </p>
        )}
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

function computeStats(
  assignments: OfficeAssignmentCell[],
  interns: OfficeInternRow[],
  internNames: Map<string, string>
) {
  const total = assignments.length;
  const completed = assignments.filter((a) => a.completed).length;
  const incomplete = total - completed;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  const byIntern = new Map<
    string,
    { assigned: number; completed: number; name: string }
  >();
  for (const intern of interns) {
    byIntern.set(intern.id, {
      assigned: 0,
      completed: 0,
      name: intern.name,
    });
  }
  for (const a of assignments) {
    const entry = byIntern.get(a.userId);
    if (!entry) continue;
    entry.assigned++;
    if (a.completed) entry.completed++;
  }

  let topIntern: { name: string; rate: number } | null = null;
  for (const entry of byIntern.values()) {
    if (entry.assigned === 0) continue;
    const rate = (entry.completed / entry.assigned) * 100;
    if (!topIntern || rate > topIntern.rate) {
      topIntern = { name: entry.name, rate };
    }
  }

  const distribution = Array.from(byIntern.entries())
    .filter(([, e]) => e.assigned > 0)
    .map(([id, e]) => ({
      id,
      name: e.name,
      percent: total > 0 ? (e.assigned / total) * 100 : 0,
      completedRate:
        e.assigned > 0 ? (e.completed / e.assigned) * 100 : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  return {
    total,
    completed,
    incomplete,
    completionRate,
    topIntern,
    distribution,
    internNames,
  };
}

export function OfficeTasksBoard({
  weekDays,
  weekRangeLabel,
  nextWeekDays,
  nextWeekRangeLabel,
  tasks: initialTasks,
  interns,
  assignments,
  nextAssignments,
  currentUserId,
  isAdmin,
  variant = "full",
}: Props & { variant?: "full" | "embed" }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [internFilter, setInternFilter] = useState("ALL");
  const [taskFilter, setTaskFilter] = useState("ALL");
  const deletedTaskIds = useRef(new Set<string>());

  useEffect(() => {
    setTasks(
      initialTasks.filter((t) => !deletedTaskIds.current.has(t.id))
    );
  }, [initialTasks]);

  const internNames = useMemo(
    () => new Map(interns.map((i) => [i.id, i.name])),
    [interns]
  );

  const stats = useMemo(
    () => computeStats(assignments, interns, internNames),
    [assignments, interns, internNames]
  );

  function exportCsv() {
    const header = ["Görev", ...weekDays.map((d) => d.shortLabel)];
    const rows = tasks.map((task) => {
      const cells = weekDays.map((day) => {
        const a = assignments.find(
          (x) => x.dateKey === day.dateKey && x.officeTaskId === task.id
        );
        if (!a) return "";
        const name = internNames.get(a.userId) ?? "";
        return a.completed ? `${name} ✓` : name;
      });
      return [task.title, ...cells];
    });
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ofis-isleri-${weekRangeLabel.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const notes = useMemo(() => {
    const items: string[] = [];
    const today = weekDays.find((d) => d.isToday);
    if (today) {
      const todayIncomplete = assignments.filter(
        (a) => a.dateKey === today.dateKey && !a.completed
      ).length;
      if (todayIncomplete > 0) {
        items.push(`Bugün ${todayIncomplete} görev henüz tamamlanmadı.`);
      }
    }
    if (stats.incomplete > 0) {
      items.push(`Bu hafta toplam ${stats.incomplete} eksik iş var.`);
    }
    if (items.length === 0) {
      items.push("Bu hafta tüm görevler tamamlanmış görünüyor.");
    }
    if (!isAdmin) {
      items.push("Bugünkü kırmızı hücreye tıklayarak görevi tamamlayın.");
    }
    return items;
  }, [assignments, isAdmin, stats.incomplete, weekDays]);

  if (variant === "embed") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ofis İşleri</h2>
            <p className="text-xs text-muted-foreground">{weekRangeLabel}</p>
          </div>
          <Link
            href="/ofis-isleri"
            className="text-xs font-medium text-primary hover:underline"
          >
            Tümünü Gör
          </Link>
        </div>
        <OfficeTaskGrid
          weekDays={weekDays}
          tasks={tasks}
          assignments={assignments}
          interns={interns}
          internNames={internNames}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          internFilter="ALL"
          taskFilter="ALL"
        />
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-green-500" />
            Tamamlandı
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-red-500" />
            Tamamlanmadı
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ofis İşleri</h1>
          <p className="text-sm text-muted-foreground">
            Ofis işlerinin haftalık dağılımını ve tamamlama durumunu takip
            edin.
          </p>
        </div>
        {isAdmin && (
          <AdminToolbar
            tasks={tasks}
            onTaskDeleted={(taskId) => {
              deletedTaskIds.current.add(taskId);
              setTasks((prev) => prev.filter((t) => t.id !== taskId));
            }}
            onTaskRestored={(task) => {
              deletedTaskIds.current.delete(task.id);
              setTasks((prev) =>
                [...prev, task].sort((a, b) =>
                  a.title.localeCompare(b.title, "tr")
                )
              );
            }}
          />
        )}
      </div>

      <div
        className={cn(
          "grid gap-4",
          isAdmin ? "sm:grid-cols-3" : "sm:grid-cols-2"
        )}
      >
        <StatCard
          title="Haftalık Tamamlama Oranı"
          value={`%${stats.completionRate.toFixed(0)}`}
          icon={CheckCircle2}
          iconClass="text-emerald-600"
          iconBg="bg-emerald-500/10"
        />
        {isAdmin && stats.topIntern && (
          <StatCard
            title="En Düzenli Stajyer"
            value={shortName(stats.topIntern.name)}
            icon={Trophy}
            iconClass="text-blue-600"
            iconBg="bg-blue-500/10"
          />
        )}
        <StatCard
          title="Eksik İşler"
          value={String(stats.incomplete)}
          icon={AlertCircle}
          iconClass="text-red-500"
          iconBg="bg-red-500/10"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tarih Aralığı</Label>
          <p className="text-sm font-medium">{weekRangeLabel}</p>
        </div>
        {isAdmin && (
          <>
            <div className="w-44 space-y-1">
              <Label className="text-xs text-muted-foreground">Stajyer</Label>
              <Select
                value={internFilter}
                onChange={(e) => setInternFilter(e.target.value)}
              >
                <option value="ALL">Tümü</option>
                {interns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-44 space-y-1">
              <Label className="text-xs text-muted-foreground">İş Grubu</Label>
              <Select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
              >
                <option value="ALL">Tümü</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-green-500" />
              Tamamlandı
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500" />
              Tamamlanmadı
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-4" />
            Dışa Aktar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <OfficeTaskGrid
            weekDays={weekDays}
            tasks={tasks}
            assignments={assignments}
            interns={interns}
            internNames={internNames}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            internFilter={internFilter}
            taskFilter={taskFilter}
          />

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Gelecek Hafta
            </h2>
            <p className="text-sm text-muted-foreground">
              {nextWeekRangeLabel} — önizleme
            </p>
            <OfficeTaskGrid
              weekDays={nextWeekDays}
              tasks={tasks}
              assignments={nextAssignments}
              interns={interns}
              internNames={internNames}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              preview
              internFilter="ALL"
              taskFilter="ALL"
            />
          </div>
        </div>

        <div className="space-y-4">
          {isAdmin && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Stajyerlere Göre Dağılım
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.distribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Veri yok.</p>
                ) : (
                  stats.distribution.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{shortName(item.name)}</span>
                        <span className="text-muted-foreground">
                          %{item.percent.toFixed(0)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notlar</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {notes.map((note, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {isAdmin && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              Görev atamalarını tablodan düzenleyebilir veya Yönet menüsünden
              görev ekleyip silebilirsiniz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
