"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  ClipboardList,
  Users,
  Clock,
  RotateCcw,
  CheckCircle2,
  Search,
  LayoutGrid,
  List,
  Send,
  Play,
  CircleDot,
} from "lucide-react";
import { assignTask, type TaskActionResult } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { KanbanTaskCard } from "@/components/kanban-task-card";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { PRIORITY_LABELS, PRIORITY_BADGE } from "@/lib/constants";
import { cn, formatDateOnly } from "@/lib/utils";
import type { TaskStatus } from "@prisma/client";
import type { BadgeVariant } from "@/lib/app-settings-defaults";
import type { TaskData, InternOption } from "@/lib/types";
import { StatCard } from "@/components/ui/stat-card";

const COLUMN_ORDER: TaskStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "SUBMITTED",
  "REVISION_REQUESTED",
  "APPROVED",
];

const COLUMN_COLORS: Record<TaskStatus, string> = {
  ASSIGNED: "border-t-blue-500",
  IN_PROGRESS: "border-t-indigo-500",
  SUBMITTED: "border-t-amber-500",
  REVISION_REQUESTED: "border-t-pink-500",
  APPROVED: "border-t-emerald-500",
};

const CARDS_PER_COLUMN = 4;
const PAGE_SIZE = 10;

export function TaskBoard({
  tasks,
  role,
  interns,
  statusLabels,
  statusBadges,
  variant = "dashboard",
  headerAction,
  onTaskMutation,
}: {
  tasks: TaskData[];
  role: "ADMIN" | "INTERN";
  interns: InternOption[];
  statusLabels: Record<TaskStatus, string>;
  statusBadges: Record<TaskStatus, BadgeVariant>;
  variant?: "dashboard" | "full";
  headerAction?: React.ReactNode;
  onTaskMutation?: (result: TaskActionResult) => void;
}) {
  const isAdmin = role === "ADMIN";
  const isFull = variant === "full";
  const [localTasks, setLocalTasks] = useState(tasks);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [internFilter, setInternFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [page, setPage] = useState(1);
  const [expandedColumns, setExpandedColumns] = useState<
    Partial<Record<TaskStatus, boolean>>
  >({});
  const [detailTask, setDetailTask] = useState<TaskData | null>(null);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleTaskMutation = useCallback(
    (result: TaskActionResult) => {
      onTaskMutation?.(result);
      if (!result.ok || !result.taskId) return;

      if (result.removed) {
        setLocalTasks((prev) => prev.filter((t) => t.id !== result.taskId));
        setDetailTask((prev) => (prev?.id === result.taskId ? null : prev));
        return;
      }

      if (result.newStatus) {
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id === result.taskId ? { ...t, status: result.newStatus! } : t
          )
        );
        setDetailTask((prev) => {
          if (!prev || prev.id !== result.taskId || !result.newStatus) return prev;
          return { ...prev, status: result.newStatus };
        });
      }
    },
    [onTaskMutation]
  );

  const filtered = useMemo(() => {
    return localTasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${t.title} ${t.description} ${t.assignedTo.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (internFilter !== "ALL" && t.assignedTo.id !== internFilter)
        return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (dateFrom && t.dueDate) {
        if (t.dueDate < new Date(dateFrom)) return false;
      }
      if (dateTo && t.dueDate) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (t.dueDate > end) return false;
      }
      return true;
    });
  }, [localTasks, search, internFilter, priorityFilter, statusFilter, dateFrom, dateTo]);

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, TaskData[]>();
    for (const status of COLUMN_ORDER) {
      map.set(status, []);
    }
    for (const task of filtered) {
      map.get(task.status)?.push(task);
    }
    return map;
  }, [filtered]);

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      SUBMITTED: 0,
      REVISION_REQUESTED: 0,
      APPROVED: 0,
    };
    for (const t of localTasks) counts[t.status]++;
    return counts;
  }, [localTasks]);

  const dashboardStats = useMemo(() => {
    const pending = localTasks.filter(
      (t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS"
    ).length;
    const revision = localTasks.filter(
      (t) => t.status === "REVISION_REQUESTED"
    ).length;
    const approved = localTasks.filter((t) => t.status === "APPROVED").length;
    return { pending, revision, approved };
  }, [localTasks]);

  const visibleColumns = COLUMN_ORDER.filter(
    (status) => isAdmin || (byStatus.get(status)?.length ?? 0) > 0
  );

  const listPageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const listPage = Math.min(page, listPageCount);
  const listItems = filtered.slice(
    (listPage - 1) * PAGE_SIZE,
    listPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, internFilter, priorityFilter, statusFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isFull ? "Görevler" : "Görev Takibi"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFull
              ? "Tüm görevleri filtreleyin, kanban veya liste görünümünde yönetin."
              : "Stajyer görevlerinin durumunu ve ilerlemesini takip edin."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerAction}
          {isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              {isFull ? "Yeni Görev" : "Yeni İş Ata"}
            </Button>
          )}
        </div>
      </div>

      {isFull && isAdmin && (
        <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Toplam Görev"
            value={String(localTasks.length)}
            icon={ClipboardList}
            iconClass="text-slate-600"
            iconBg="bg-slate-500/10"
          />
          <StatCard
            title={statusLabels.ASSIGNED}
            value={String(statusCounts.ASSIGNED)}
            icon={CircleDot}
            iconClass="text-blue-600"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            title={statusLabels.IN_PROGRESS}
            value={String(statusCounts.IN_PROGRESS)}
            icon={Play}
            iconClass="text-indigo-600"
            iconBg="bg-indigo-500/10"
          />
          <StatCard
            title={statusLabels.SUBMITTED}
            value={String(statusCounts.SUBMITTED)}
            icon={Send}
            iconClass="text-amber-600"
            iconBg="bg-amber-500/10"
          />
          <StatCard
            title={statusLabels.REVISION_REQUESTED}
            value={String(statusCounts.REVISION_REQUESTED)}
            icon={RotateCcw}
            iconClass="text-pink-600"
            iconBg="bg-pink-500/10"
          />
          <StatCard
            title={statusLabels.APPROVED}
            value={String(statusCounts.APPROVED)}
            icon={CheckCircle2}
            iconClass="text-emerald-600"
            iconBg="bg-emerald-500/10"
          />
        </div>
      )}

      {!isFull && isAdmin && (
        <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-4">
          <StatCard
            title="Toplam Stajyer"
            value={String(interns.length)}
            icon={Users}
            iconClass="text-blue-600"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            title="Bekleyen İş"
            value={String(dashboardStats.pending)}
            icon={Clock}
            iconClass="text-amber-600"
            iconBg="bg-amber-500/10"
          />
          <StatCard
            title="Revizede"
            value={String(dashboardStats.revision)}
            icon={RotateCcw}
            iconClass="text-pink-600"
            iconBg="bg-pink-500/10"
          />
          <StatCard
            title="Onaylanan"
            value={String(dashboardStats.approved)}
            icon={CheckCircle2}
            iconClass="text-emerald-600"
            iconBg="bg-emerald-500/10"
          />
        </div>
      )}

      {(isFull || isAdmin) && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
          {isFull && (
            <div className="min-w-[180px] flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Görev ara..."
                  className="pl-9"
                />
              </div>
            </div>
          )}
          {isFull && (
            <div className="w-40 space-y-1">
              <Label className="text-xs text-muted-foreground">Durum</Label>
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as TaskStatus | "ALL")
                }
              >
                <option value="ALL">Tümü</option>
                {COLUMN_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {isAdmin && (
            <div className="w-44 space-y-1">
              <Label className="text-xs text-muted-foreground">Stajyer</Label>
              <Select
                value={internFilter}
                onChange={(e) => setInternFilter(e.target.value)}
              >
                <option value="ALL">Tüm Stajyerler</option>
                {interns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="w-40 space-y-1">
            <Label className="text-xs text-muted-foreground">Öncelik</Label>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">Tüm Öncelikler</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          {isFull && (
            <>
              <div className="w-36 space-y-1">
                <Label className="text-xs text-muted-foreground">Başlangıç</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="w-36 space-y-1">
                <Label className="text-xs text-muted-foreground">Bitiş</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </>
          )}
          {isFull && (
            <div className="ml-auto flex gap-1 rounded-lg border p-1">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "kanban" ? "default" : "ghost"}
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="size-4" />
                Kanban
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
              >
                <List className="size-4" />
                Liste
              </Button>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ClipboardList className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {localTasks.length === 0
              ? isAdmin
                ? "Henüz görev atanmadı."
                : "Size atanmış görev bulunmuyor."
              : "Filtreye uygun görev bulunamadı."}
          </p>
        </div>
      ) : viewMode === "list" && isFull ? (
        <TaskListView
          tasks={listItems}
          statusLabels={statusLabels}
          statusBadges={statusBadges}
          onOpenDetail={setDetailTask}
        />
      ) : (
        <div
          className={cn(
            isFull
              ? "flex gap-4 overflow-x-auto pb-2"
              : "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
          )}
        >
          {visibleColumns.map((status) => {
            const columnTasks = byStatus.get(status) ?? [];
            const expanded = expandedColumns[status];
            const visibleTasks = isFull && !expanded
              ? columnTasks.slice(0, CARDS_PER_COLUMN)
              : columnTasks;
            const hiddenCount = columnTasks.length - visibleTasks.length;

            return (
              <div
                key={status}
                className={cn(
                  "flex flex-col rounded-lg border border-t-4 bg-muted/20",
                  COLUMN_COLORS[status],
                  isFull ? "w-64 shrink-0" : "min-w-0"
                )}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <h2 className="text-sm font-semibold">
                    {statusLabels[status]}
                  </h2>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {columnTasks.length}
                    </span>
                    {isFull && isAdmin && (
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Yeni görev"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 px-2 pb-3">
                  {visibleTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      role={role}
                      statusLabels={statusLabels}
                      statusBadges={statusBadges}
                      onOpenDetail={setDetailTask}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Boş
                    </p>
                  )}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedColumns((prev) => ({
                          ...prev,
                          [status]: true,
                        }))
                      }
                      className="py-1 text-center text-xs font-medium text-primary hover:underline"
                    >
                      + {hiddenCount} görev daha
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFull && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
          <span>Toplam {filtered.length} görev</span>
          {viewMode === "list" && listPageCount > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={listPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Önceki
              </Button>
              <span>
                {listPage} / {listPageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={listPage >= listPageCount}
                onClick={() => setPage((p) => Math.min(listPageCount, p + 1))}
              >
                Sonraki
              </Button>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <AssignModal
          open={open}
          onClose={() => setOpen(false)}
          interns={interns}
          onAssigned={handleTaskMutation}
        />
      )}

      <TaskDetailModal
        task={detailTask}
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        role={role}
        statusLabels={statusLabels}
        statusBadges={statusBadges}
        onTaskMutation={handleTaskMutation}
      />
    </div>
  );
}

function TaskListView({
  tasks,
  statusLabels,
  statusBadges,
  onOpenDetail,
}: {
  tasks: TaskData[];
  statusLabels: Record<TaskStatus, string>;
  statusBadges: Record<TaskStatus, BadgeVariant>;
  onOpenDetail: (task: TaskData) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-semibold">Görev</th>
            <th className="px-4 py-3 font-semibold">Stajyer</th>
            <th className="px-4 py-3 font-semibold">Durum</th>
            <th className="px-4 py-3 font-semibold">Öncelik</th>
            <th className="px-4 py-3 font-semibold">Son Teslim</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b last:border-b-0">
              <td className="px-4 py-3 font-medium">{task.title}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {task.assignedTo.name}
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusBadges[task.status]}>
                  {statusLabels[task.status]}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={PRIORITY_BADGE[task.priority]}>
                  {PRIORITY_LABELS[task.priority]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {task.dueDate ? formatDateOnly(task.dueDate) : "—"}
              </td>
              <td className="px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenDetail(task)}
                >
                  Detay
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignModal({
  open,
  onClose,
  interns,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  interns: InternOption[];
  onAssigned?: (result: TaskActionResult) => void;
}) {
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(assignTask, undefined);

  useEffect(() => {
    if (!state?.ok) return;
    onAssigned?.(state);
    if (state.mailWarning) return;
    if (state.mailSuccess) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
    onClose();
  }, [state, onClose, onAssigned]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yeni Görev"
      description="Görevi bir stajyere atayın."
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Başlık</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Açıklama</Label>
          <Textarea id="description" name="description" rows={3} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedToId">Stajyer</Label>
          <Select id="assignedToId" name="assignedToId" required defaultValue="">
            <option value="" disabled>
              Seçin
            </option>
            {interns.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.email})
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="priority">Öncelik</Label>
            <Select id="priority" name="priority" defaultValue="MEDIUM">
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Son Teslim</Label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>
        </div>
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state?.mailWarning && (
          <p className="text-sm text-amber-600">{state.mailWarning}</p>
        )}
        {state?.mailSuccess && (
          <p className="text-sm text-green-600">{state.mailSuccess}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <AssignButton />
        </div>
      </form>
    </Modal>
  );
}

function AssignButton() {
  return (
    <FormSubmitButton label="Görev Ata" pendingLabel="Yükleniyor..." icon={Plus} />
  );
}
