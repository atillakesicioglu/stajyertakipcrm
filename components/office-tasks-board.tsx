"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Plus,
  Trash2,
  Loader2,
  Building2,
  CheckCircle2,
  Circle,
  Users,
} from "lucide-react";
import {
  createOfficeTask,
  deleteOfficeTask,
  toggleOfficeAssignment,
  type OfficeActionResult,
} from "@/lib/actions/office-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type OfficeTaskItem = {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
};

export type OfficeAssignmentItem = {
  id: string;
  completed: boolean;
  completedAt: Date | null;
  user: { id: string; name: string };
  officeTask: { id: string; title: string; description: string | null };
};

type Props =
  | {
      role: "ADMIN";
      todayLabel: string;
      tasks: OfficeTaskItem[];
      assignments: OfficeAssignmentItem[];
      internCount: number;
    }
  | {
      role: "INTERN";
      todayLabel: string;
      currentUserId: string;
      assignments: OfficeAssignmentItem[];
    };

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Plus />}
      Ekle
    </Button>
  );
}

function AssignmentToggle({
  assignment,
  canToggle,
}: {
  assignment: OfficeAssignmentItem;
  canToggle: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!canToggle) return;
    const fd = new FormData();
    fd.set("id", assignment.id);
    startTransition(async () => {
      await toggleOfficeAssignment(fd);
    });
  }

  return (
    <Button
      variant={assignment.completed ? "secondary" : "outline"}
      size="sm"
      disabled={!canToggle || isPending}
      onClick={handleToggle}
      className="gap-2"
    >
      {isPending ? (
        <Loader2 className="animate-spin" />
      ) : assignment.completed ? (
        <CheckCircle2 className="text-emerald-600" />
      ) : (
        <Circle />
      )}
      {assignment.completed ? "Tamamlandı" : "Tamamladım"}
    </Button>
  );
}

export function OfficeTasksBoard(props: Props) {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [state, formAction] = useActionState<
    OfficeActionResult | undefined,
    FormData
  >(createOfficeTask, undefined);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  const deleteTask =
    props.role === "ADMIN"
      ? props.tasks.find((t) => t.id === deleteId)
      : undefined;

  function handleDelete() {
    if (!deleteId) return;
    const fd = new FormData();
    fd.set("id", deleteId);
    startDelete(async () => {
      await deleteOfficeTask(fd);
      setDeleteId(null);
    });
  }

  const completedCount = props.assignments.filter((a) => a.completed).length;
  const totalCount = props.assignments.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ofis İşleri</h1>
          <p className="text-sm text-muted-foreground">{props.todayLabel}</p>
        </div>
        {props.role === "ADMIN" && (
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Yeni İş Ekle
          </Button>
        )}
      </div>

      {props.role === "ADMIN" && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
            <Building2 className="size-4 text-muted-foreground" />
            <span>
              <strong>{props.tasks.length}</strong> tanımlı iş
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
            <Users className="size-4 text-muted-foreground" />
            <span>
              <strong>{props.internCount}</strong> aktif stajyer
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>
              Bugün <strong>{completedCount}/{totalCount}</strong> tamamlandı
            </span>
          </div>
        </div>
      )}

      {props.role === "INTERN" && (
        <p className="text-sm text-muted-foreground">
          Bugün size atanan {props.assignments.length} iş — tamamladıkça
          işaretleyin.
        </p>
      )}

      {/* Bugünkü atamalar */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Bugünkü Dağıtım</h2>
          <p className="text-xs text-muted-foreground">
            İşler her gün stajyerlere eşit dağıtılır; aynı iş arka arkaya aynı
            kişiye verilmez.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>İş</TableHead>
              {props.role === "ADMIN" && <TableHead>Atanan</TableHead>}
              <TableHead>Durum</TableHead>
              {props.role === "INTERN" && (
                <TableHead className="text-right">Onay</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.assignments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={props.role === "ADMIN" ? 3 : 3}
                  className="py-10 text-center text-muted-foreground"
                >
                  {props.role === "ADMIN"
                    ? "Henüz ofis işi tanımlanmadı veya stajyer yok."
                    : "Bugün size atanan ofis işi bulunmuyor."}
                </TableCell>
              </TableRow>
            ) : (
              props.assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.officeTask.title}</div>
                    {a.officeTask.description && (
                      <div className="text-xs text-muted-foreground">
                        {a.officeTask.description}
                      </div>
                    )}
                  </TableCell>
                  {props.role === "ADMIN" && (
                    <TableCell>{a.user.name}</TableCell>
                  )}
                  <TableCell>
                    {a.completed ? (
                      <Badge variant="success">Yapıldı</Badge>
                    ) : (
                      <Badge variant="warning">Bekliyor</Badge>
                    )}
                  </TableCell>
                  {props.role === "INTERN" && (
                    <TableCell className="text-right">
                      <AssignmentToggle
                        assignment={a}
                        canToggle={a.user.id === props.currentUserId}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Admin: iş tanımları */}
      {props.role === "ADMIN" && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Tanımlı Ofis İşleri</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İş Adı</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.tasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Henüz ofis işi eklenmedi.
                  </TableCell>
                </TableRow>
              ) : (
                props.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(task.id)}
                        aria-label="Sil"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {props.role === "ADMIN" && (
        <>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Yeni Ofis İşi"
            description="Bu iş her gün aktif stajyerlere otomatik dağıtılır."
          >
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">İş Adı</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Örn: Çöp boşalt"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama (isteğe bağlı)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detaylar..."
                  rows={2}
                />
              </div>
              {state?.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  İptal
                </Button>
                <CreateButton />
              </div>
            </form>
          </Modal>

          <Modal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            title="Ofis İşini Sil"
            description={
              deleteTask
                ? `"${deleteTask.title}" kalıcı olarak silinecek.`
                : ""
            }
          >
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                Sil
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
