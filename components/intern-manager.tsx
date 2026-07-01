"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, Trash2, Loader2, KeyRound } from "lucide-react";
import {
  createIntern,
  deleteIntern,
  resetInternPassword,
  type ActionResult,
} from "@/lib/actions/interns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type Intern = {
  id: string;
  name: string;
  email: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  needsPasswordSetup: boolean;
  _count: { assignedTasks: number };
};

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
      Stajyer Ekle
    </Button>
  );
}

export function InternManager({ interns }: { interns: Intern[] }) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [isResetting, startReset] = useTransition();
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    createIntern,
    undefined
  );

  function handleDelete() {
    if (!confirmId) return;
    const fd = new FormData();
    fd.set("id", confirmId);
    startDelete(async () => {
      await deleteIntern(fd);
      setConfirmId(null);
    });
  }

  function handleReset() {
    if (!resetId) return;
    const fd = new FormData();
    fd.set("id", resetId);
    startReset(async () => {
      await resetInternPassword(fd);
      setResetId(null);
    });
  }

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
    }
  }, [state]);

  const confirmIntern = interns.find((i) => i.id === confirmId);
  const resetIntern = interns.find((i) => i.id === resetId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stajyerler</h1>
          <p className="text-sm text-muted-foreground">
            Toplam {interns.length} stajyer
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus />
          Yeni Stajyer
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Atanan İş</TableHead>
              <TableHead>Son Giriş</TableHead>
              <TableHead>Kayıt Tarihi</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Henüz stajyer eklenmedi.
                </TableCell>
              </TableRow>
            ) : (
              interns.map((intern) => (
                <TableRow key={intern.id}>
                  <TableCell className="font-medium">{intern.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {intern.email}
                  </TableCell>
                  <TableCell>
                    {intern.needsPasswordSetup ? (
                      <Badge variant="warning">Şifre bekliyor</Badge>
                    ) : (
                      <Badge variant="success">Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>{intern._count.assignedTasks}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(intern.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(intern.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setResetId(intern.id)}
                        aria-label="Şifreyi sıfırla"
                        title="Şifreyi sıfırla"
                      >
                        <KeyRound className="size-4 text-amber-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmId(intern.id)}
                        aria-label="Sil"
                        title="Sil"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Yeni Stajyer Oluştur"
        description="Stajyer ilk girişinde kendi şifresini belirleyecektir."
      >
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ad Soyad</Label>
            <Input id="name" name="name" placeholder="Ahmet Yılmaz" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ahmet@firma.com"
              required
            />
          </div>
          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
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
        open={!!resetId}
        onClose={() => setResetId(null)}
        title="Şifreyi Sıfırla"
        description={
          resetIntern
            ? `${resetIntern.name} bir sonraki girişinde şifre alanını boş bırakarak panele girecek ve yeni şifresini kendisi belirleyecektir.`
            : ""
        }
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setResetId(null)}
            disabled={isResetting}
          >
            İptal
          </Button>
          <Button onClick={handleReset} disabled={isResetting}>
            {isResetting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <KeyRound />
            )}
            Şifreyi Sıfırla
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Stajyeri Sil"
        description={
          confirmIntern
            ? `${confirmIntern.name} ve tüm işleri kalıcı olarak silinecek. Bu işlem geri alınamaz.`
            : ""
        }
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmId(null)}
            disabled={isDeleting}
          >
            İptal
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Sil
          </Button>
        </div>
      </Modal>
    </div>
  );
}
