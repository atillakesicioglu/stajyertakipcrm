"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Loader2, ClipboardList } from "lucide-react";
import { assignTask, type TaskActionResult } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { TaskCard } from "@/components/task-card";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/constants";
import type { TaskData, InternOption } from "@/lib/types";

export function TaskBoard({
  tasks,
  role,
  interns,
}: {
  tasks: TaskData[];
  role: "ADMIN" | "INTERN";
  interns: InternOption[];
}) {
  const isAdmin = role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [internFilter, setInternFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter)
        return false;
      if (internFilter !== "ALL" && t.assignedTo.id !== internFilter)
        return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, internFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">İşler</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? `Toplam ${tasks.length} iş`
              : "Size atanan işler"}
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
        <div className="flex flex-wrap gap-3">
          <div className="w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tüm Durumlar</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
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
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ClipboardList className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {tasks.length === 0
              ? isAdmin
                ? "Henüz iş atanmadı. Yeni bir iş atayın."
                : "Size atanmış bir iş bulunmuyor."
              : "Filtreye uygun iş bulunamadı."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} role={role} />
          ))}
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
      description="İşi bir stajyere atayın ve detayları girin."
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Başlık</Label>
          <Input id="title" name="title" placeholder="İş başlığı" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Açıklama</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="İş detaylarını yazın"
            rows={3}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedToId">Stajyer</Label>
          <Select id="assignedToId" name="assignedToId" required defaultValue="">
            <option value="" disabled>
              Stajyer seçin
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
            <Label htmlFor="dueDate">Son Teslim Tarihi</Label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>
        </div>
        {state?.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
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
