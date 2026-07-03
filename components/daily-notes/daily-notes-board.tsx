"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Plus,
  Loader2,
  User,
  Paperclip,
  FileText,
  TrendingUp,
  Users,
  Star,
  BarChart3,
} from "lucide-react";
import { createDailyReport, type ReportActionResult } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DailyNoteRow, DailyNotesStats } from "@/lib/queries/daily-notes";

const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
];

function formatDateTR(date: Date): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTimeTR(date: Date): string {
  return new Date(date).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tagColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return TAG_COLORS[hash % TAG_COLORS.length]!;
}

function NoteCard({ report, showAuthor = true }: { report: DailyNoteRow; showAuthor?: boolean }) {
  const preview =
    report.content.length > 160
      ? `${report.content.slice(0, 160)}…`
      : report.content;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          {showAuthor && (
            <p className="truncate font-semibold">{report.user.name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDateTR(report.date)} · {formatTimeTR(report.createdAt)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <span
          className={`inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium ${tagColor(report.id)}`}
        >
          Günlük Not
        </span>
        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {preview}
        </p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {report.screenshotUrl && (
            <span className="flex items-center gap-1">
              <Paperclip className="size-3.5" />1 dosya
            </span>
          )}
          <span className="flex items-center gap-1">
            <FileText className="size-3.5" />
            Not
          </span>
        </div>
        {report.screenshotUrl && (
          <img
            src={report.screenshotUrl}
            alt={report.screenshotName ?? "Ek"}
            className="max-h-40 rounded-md border object-contain"
          />
        )}
      </CardContent>
    </Card>
  );
}

function WriteNoteCard({ hasToday }: { hasToday: boolean }) {
  const [state, formAction] = useActionState<
    ReportActionResult | undefined,
    FormData
  >(createDailyReport, undefined);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (state?.ok) setSubmitted(true);
  }, [state]);

  if (hasToday || submitted) {
    return (
      <Card className="border-dashed border-emerald-300 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="flex items-center gap-3 p-6">
          <FileText className="size-8 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              Bugünkü notunuz gönderildi
            </p>
            <p className="text-sm text-muted-foreground">
              Yarın yeni bir not ekleyebilirsiniz.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">Bugünkü Notunuz</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <Textarea
            name="content"
            placeholder="Bugün neler yaptınız?"
            rows={4}
            required
          />
          <div className="space-y-1.5">
            <Label htmlFor="screenshot">Ekran görüntüsü (opsiyonel)</Label>
            <input
              id="screenshot"
              name="screenshot"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <SubmitNoteButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitNoteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Plus />}
      Not Gönder
    </Button>
  );
}

function WeeklyActivityChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-28 items-end justify-between gap-1">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-primary/80"
            style={{
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count > 0 ? 4 : 0,
            }}
          />
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function AdminSidebar({ stats }: { stats: DailyNotesStats }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Not Özeti</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <FileText className="size-4" />
              <span className="text-xs text-muted-foreground">Bugünkü Notlar</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.todayCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-amber-600">
              <Users className="size-4" />
              <span className="text-xs text-muted-foreground">Not Girmeyenler</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.missingToday}</p>
          </div>
          {stats.topIntern && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Star className="size-4" />
                <span className="text-xs text-muted-foreground">En Aktif Stajyer</span>
              </div>
              <p className="mt-1 text-sm font-bold">{stats.topIntern.name}</p>
              <p className="text-xs text-muted-foreground">
                {stats.topIntern.count} not (7 gün)
              </p>
            </div>
          )}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-violet-600">
              <TrendingUp className="size-4" />
              <span className="text-xs text-muted-foreground">Ort. Günlük Giriş</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.avgDaily.toFixed(1)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Haftalık Not Aktivitesi</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyActivityChart data={stats.weeklyActivity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Son Notlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recentSnippets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz not yok.</p>
          ) : (
            stats.recentSnippets.map((item, i) => (
              <div key={i} className="border-b pb-2 last:border-0">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {item.content}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatTimeTR(item.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type InternOption = { id: string; name: string };

export function DailyNotesBoard({
  reports,
  interns,
  todayReport,
  stats,
  isAdmin,
}: {
  reports: DailyNoteRow[];
  interns: InternOption[];
  todayReport: DailyNoteRow | null;
  stats: DailyNotesStats | null;
  isAdmin: boolean;
}) {
  const [internFilter, setInternFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(9);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (internFilter !== "ALL" && r.user.id !== internFilter) return false;
      if (dateFilter) {
        const key = new Date(r.date).toISOString().slice(0, 10);
        if (key !== dateFilter) return false;
      }
      if (statusFilter === "WITH_FILE" && !r.screenshotUrl) return false;
      if (statusFilter === "NO_FILE" && r.screenshotUrl) return false;
      return true;
    });
  }, [reports, internFilter, dateFilter, statusFilter]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Günlük Notlar</h1>
        <p className="text-sm text-muted-foreground">
          Stajyerlerin günlük yazılı güncellemelerini görüntüleyin ve yönetin.
        </p>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
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
          <div className="w-40 space-y-1">
            <Label className="text-xs text-muted-foreground">Tarih</Label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="w-40 space-y-1">
            <Label className="text-xs text-muted-foreground">Durum</Label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tümü</option>
              <option value="WITH_FILE">Dosyalı</option>
              <option value="NO_FILE">Dosyasız</option>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInternFilter("ALL");
              setDateFilter("");
              setStatusFilter("ALL");
            }}
          >
            Filtreleri Temizle
          </Button>
        </div>
      )}

      <div className={isAdmin ? "grid gap-6 xl:grid-cols-[1fr_300px]" : ""}>
        <div className="space-y-4">
          {!isAdmin && (
            <WriteNoteCard hasToday={!!todayReport} />
          )}

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <BarChart3 className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {isAdmin ? "Filtrelere uygun not bulunamadı." : "Henüz not yok."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((report) => (
                <NoteCard
                  key={report.id}
                  report={report}
                  showAuthor={isAdmin}
                />
              ))}
            </div>
          )}

          {filtered.length > visibleCount && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + 9)}
              >
                Daha fazla not yükle
              </Button>
            </div>
          )}
        </div>

        {isAdmin && stats && <AdminSidebar stats={stats} />}
      </div>
    </div>
  );
}
