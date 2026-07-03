"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Plus,
  Loader2,
  ClipboardList,
  Users,
  Clock,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { assignTask, type TaskActionResult } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { KanbanTaskCard } from "@/components/kanban-task-card";
import { PRIORITY_LABELS } from "@/lib/constants";
import type { TaskStatus } from "@prisma/client";
import type { BadgeVariant } from "@/lib/app-settings-defaults";
import type { TaskData, InternOption } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

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

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
  iconBg,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-xl p-3 ${iconBg}`}>
          <Icon className={`size-6 ${iconClass}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskBoard({
  tasks,
  role,
  interns,
  statusLabels,
  statusBadges,
}: {
  tasks: TaskData[];
  role: "ADMIN" | "INTERN";
  interns: InternOption[];
  statusLabels: Record<TaskStatus, string>;
  statusBadges: Record<TaskStatus, BadgeVariant>;
}) {
  const isAdmin = role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [internFilter, setInternFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (internFilter !== "ALL" && t.assignedTo.id !== internFilter)
        return false;
      return true;
    });
  }, [tasks, internFilter, priorityFilter]);

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

  const stats = useMemo(() => {
    const pending = tasks.filter(
      (t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS"
    ).length;
    const revision = tasks.filter(
      (t) => t.status === "REVISION_REQUESTED"
    ).length;
    const approved = tasks.filter((t) => t.status === "APPROVED").length;
    return { pending, revision, approved };
  }, [tasks]);

  const visibleColumns = COLUMN_ORDER.filter(
    (status) => isAdmin || (byStatus.get(status)?.length ?? 0) > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Görev Takibi</h1>
          <p className="text-sm text-muted-foreground">
            Stajyer görevlerinin durumunu ve ilerlemesini takip edin.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Yeni İş Ata
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Toplam Stajyer"
            value={String(interns.length)}
            icon={Users}
            iconClass="text-blue-600"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            title="Bekleyen İş"
            value={String(stats.pending)}
            icon={Clock}
            iconClass="text-amber-600"
            iconBg="bg-amber-500/10"
          />
          <StatCard
            title="Revizede"
            value={String(stats.revision)}
            icon={RotateCcw}
            iconClass="text-pink-600"
            iconBg="bg-pink-500/10"
          />
          <StatCard
            title="Onaylanan"
            value={String(stats.approved)}
            icon={CheckCircle2}
            iconClass="text-emerald-600"
            iconBg="bg-emerald-500/10"
          />
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <div className="w-48">
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
          <div className="w-40">
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
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ClipboardList className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {tasks.length === 0
              ? isAdmin
                ? "Henüz iş atanmadı."
                : "Size atanmış iş bulunmuyor."
              : "Filtreye uygun iş bulunamadı."}
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {visibleColumns.map((status) => {
            const columnTasks = byStatus.get(status) ?? [];
            return (
              <div
                key={status}
                className={`flex w-64 shrink-0 flex-col rounded-lg border border-t-4 bg-muted/20 ${COLUMN_COLORS[status]}`}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <h2 className="text-sm font-semibold">
                    {statusLabels[status]}
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 px-2 pb-3">
                  {columnTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      role={role}
                      statusLabels={statusLabels}
                      statusBadges={statusBadges}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Boş
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <AssignModal
          open={open}
          onClose={() => setOpen(false)}
          interns={interns}
        />
      )}
    </div>
  );
}

function AssignModal({
  open,
  onClose,
  interns,
}: {
  open: boolean;
  onClose: () => void;
  interns: InternOption[];
}) {
  const [state, formAction] = useActionState<
    TaskActionResult | undefined,
    FormData
  >(assignTask, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yeni İş Ata"
      description="İşi bir stajyere atayın."
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
                {i.name}
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
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Plus />}
      İş Ata
    </Button>
  );
}
