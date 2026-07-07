"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  UserPlus,
  Trash2,
  Loader2,
  KeyRound,
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  User,
  Mail,
  Phone,
  X,
} from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type {
  InternDirectoryRow,
  InternDirectoryStats,
} from "@/lib/queries/intern-directory";
import type { InternScoreBreakdown } from "@/lib/gamification/scoring";
import { STATUS_LABELS } from "@/lib/constants";
import type { TaskStatus } from "@prisma/client";
import { Flame, Star } from "lucide-react";
import { BADGE_MAP } from "@/lib/gamification/constants";

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
      {pending ? "Yükleniyor..." : "Stajyer Ekle"}
    </Button>
  );
}

function statusBadge(status: InternDirectoryRow["status"]) {
  if (status === "pending")
    return <Badge variant="warning">Şifre Bekliyor</Badge>;
  if (status === "completed")
    return <Badge variant="info">Tamamlandı</Badge>;
  return <Badge variant="success">Aktif</Badge>;
}

function WeeklyProgressChart({
  data,
}: {
  data: { label: string; percent: number }[];
}) {
  const max = 100;
  return (
    <div className="flex h-24 items-end justify-between gap-1">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-primary/80"
            style={{
              height: `${(d.percent / max) * 100}%`,
              minHeight: d.percent > 0 ? 4 : 0,
            }}
          />
          <span className="text-[9px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function InternProfilePanel({
  intern,
  mentorName,
  gamification,
  weekData,
  onClose,
}: {
  intern: InternDirectoryRow;
  mentorName: string;
  gamification?: InternScoreBreakdown & { rank: number };
  weekData: { label: string; percent: number }[];
  onClose: () => void;
}) {

  return (
    <Card className="sticky top-4 h-fit">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Stajyer Profili</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Kapat">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-8" />
          </div>
          <h3 className="mt-3 font-semibold">{intern.name}</h3>
          {statusBadge(intern.status)}
          <p className="mt-2 text-sm text-muted-foreground">Stajyer</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-4 shrink-0" />
            <span className="truncate">{intern.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-4 shrink-0" />
            <span>Mentor: {mentorName}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Haftalık İlerleme</p>
          <WeeklyProgressChart data={weekData} />
        </div>

        {gamification && (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Performans Skoru</p>
              {gamification.rank > 0 && (
                <Badge variant="warning">#{gamification.rank}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Genel Puan</p>
                <p className="text-xl font-bold">{gamification.totalScore}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Seviye</p>
                <p className="font-semibold">
                  {gamification.level} · {gamification.levelTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  {gamification.xp} XP
                </p>
              </div>
            </div>
            {gamification.streakDays > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-orange-600">
                <Flame className="size-3.5" />
                {gamification.streakDays} gün seri
              </p>
            )}
            {gamification.earnedBadgeKeys.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {gamification.earnedBadgeKeys.slice(0, 6).map((key) => {
                  const def = BADGE_MAP[key];
                  if (!def) return null;
                  return (
                    <Badge key={key} variant="info" className="text-[10px]">
                      <Star className="mr-1 size-3" />
                      {def.label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">Son Atanan Görevler</p>
          <div className="space-y-2">
            {intern.recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Görev yok.</p>
            ) : (
              intern.recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABELS[task.status as TaskStatus] ?? task.status} ·{" "}
                    {formatDate(task.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InternManager({
  interns,
  stats,
  mentorName,
  isAdmin,
  gamificationByIntern,
  weeklyProgressByIntern,
}: {
  interns: InternDirectoryRow[];
  stats: InternDirectoryStats;
  mentorName: string;
  isAdmin: boolean;
  gamificationByIntern?: Record<
    string,
    InternScoreBreakdown & { rank: number }
  >;
  weeklyProgressByIntern?: Record<string, { label: string; percent: number }[]>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [isResetting, startReset] = useTransition();
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    createIntern,
    undefined
  );

  const filtered = useMemo(() => {
    return interns.filter((i) => {
      if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          i.name.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [interns, search, statusFilter]);

  const selected = interns.find((i) => i.id === selectedId) ?? null;

  function handleDelete() {
    if (!confirmId) return;
    const fd = new FormData();
    fd.set("id", confirmId);
    startDelete(async () => {
      await deleteIntern(fd);
      setConfirmId(null);
      if (selectedId === confirmId) setSelectedId(null);
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
    if (state?.ok) setOpen(false);
  }, [state]);

  const confirmIntern = interns.find((i) => i.id === confirmId);
  const resetIntern = interns.find((i) => i.id === resetId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stajyerler</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Stajyer ekibini yönetin, performanslarını takip edin."
              : "Ekip arkadaşlarınızı görüntüleyin."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)}>
            <UserPlus />
            Stajyer Ekle
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Toplam Stajyer"
            value={String(stats.totalInterns)}
            icon={Users}
            iconClass="text-blue-600"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            title="Aktif Görev"
            value={String(stats.activeTasks)}
            icon={Briefcase}
            iconClass="text-emerald-600"
            iconBg="bg-emerald-500/10"
          />
          <StatCard
            title="Teslim Bekleyen"
            value={String(stats.pendingSubmissions)}
            icon={Clock}
            iconClass="text-amber-600"
            iconBg="bg-amber-500/10"
          />
          <StatCard
            title="Ortalama Performans"
            value={`%${stats.avgPerformance}`}
            icon={TrendingUp}
            iconClass="text-violet-600"
            iconBg="bg-violet-500/10"
          />
        </div>
      )}

      <div className={isAdmin && selected ? "grid gap-6 xl:grid-cols-[1fr_300px]" : ""}>
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Stajyer ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="pending">Şifre Bekliyor</option>
                <option value="completed">Tamamlandı</option>
              </Select>
            </div>
          )}

          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Stajyer Listesi</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stajyer</TableHead>
                  {isAdmin && <TableHead>Mentor</TableHead>}
                  <TableHead>Aktif Görev</TableHead>
                  <TableHead>Tamamlanma</TableHead>
                  {isAdmin && <TableHead>Son Günlük Not</TableHead>}
                  <TableHead>Durum</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">İşlem</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Stajyer bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((intern) => (
                    <TableRow
                      key={intern.id}
                      className={
                        isAdmin
                          ? "cursor-pointer hover:bg-muted/50"
                          : undefined
                      }
                      onClick={() =>
                        isAdmin && setSelectedId(intern.id)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="size-4" />
                          </div>
                          <div>
                            <p className="font-medium">{intern.name}</p>
                            {isAdmin && (
                              <p className="text-xs text-muted-foreground">
                                {intern.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-sm text-muted-foreground">
                          {mentorName}
                        </TableCell>
                      )}
                      <TableCell>{intern.activeTasks}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${intern.completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            %{intern.completionRate}
                          </span>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="max-w-[180px]">
                          {intern.lastNote ? (
                            <div>
                              <p className="truncate text-xs text-muted-foreground">
                                {intern.lastNote.content}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70">
                                {formatDate(intern.lastNote.date)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>{statusBadge(intern.status)}</TableCell>
                      {isAdmin && (
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setResetId(intern.id)}
                              aria-label="Şifreyi sıfırla"
                            >
                              <KeyRound className="size-4 text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmId(intern.id)}
                              aria-label="Sil"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {isAdmin && selected && (
          <InternProfilePanel
            intern={selected}
            mentorName={mentorName}
            gamification={gamificationByIntern?.[selected.id]}
            weekData={
              weeklyProgressByIntern?.[selected.id] ?? [
                { label: "Pzt", percent: 0 },
                { label: "Sal", percent: 0 },
                { label: "Çar", percent: 0 },
                { label: "Per", percent: 0 },
                { label: "Cum", percent: 0 },
                { label: "Cmt", percent: 0 },
                { label: "Paz", percent: 0 },
              ]
            }
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {isAdmin && (
        <>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Yeni Stajyer Oluştur"
            description="Stajyer ilk girişinde kendi şifresini belirleyecektir."
          >
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
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
            open={!!resetId}
            onClose={() => setResetId(null)}
            title="Şifreyi Sıfırla"
            description={
              resetIntern
                ? `${resetIntern.name} yeni şifresini kendisi belirleyecektir.`
                : ""
            }
          >
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetId(null)} disabled={isResetting}>
                İptal
              </Button>
              <Button onClick={handleReset} disabled={isResetting}>
                {isResetting ? <Loader2 className="animate-spin" /> : <KeyRound />}
                {isResetting ? "Yükleniyor..." : "Sıfırla"}
              </Button>
            </div>
          </Modal>

          <Modal
            open={!!confirmId}
            onClose={() => setConfirmId(null)}
            title="Stajyeri Sil"
            description={
              confirmIntern
                ? `${confirmIntern.name} kalıcı olarak silinecek.`
                : ""
            }
          >
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmId(null)} disabled={isDeleting}>
                İptal
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {isDeleting ? "Yükleniyor..." : "Sil"}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
