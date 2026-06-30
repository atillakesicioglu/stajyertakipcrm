"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  CalendarDays,
  User,
  Clock,
} from "lucide-react";
import { createDailyReport, type ReportActionResult } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/* ---------- Tipler ---------- */

type DailyReportItem = {
  id: string;
  content: string;
  screenshotUrl?: string | null;
  screenshotName?: string | null;
  date: Date;
  createdAt: Date;
  user: { id: string; name: string };
};

type InternSummary = {
  id: string;
  name: string;
  reportCount: number;
};

/* ---------- Yardımcı ---------- */

function formatDateTR(date: Date): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeTR(date: Date): string {
  return new Date(date).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayTR(): string {
  return new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ================================================================
   ADMIN görünümü
   ================================================================ */

export function AdminReportView({ reports }: { reports: DailyReportItem[] }) {
  const [internFilter, setInternFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState<DailyReportItem | null>(null);
  const [expandedIntern, setExpandedIntern] = useState<string | null>(null);

  // Stajyerlerin tekil listesi
  const interns: InternSummary[] = useMemo(() => {
    const map = new Map<string, InternSummary>();
    for (const r of reports) {
      const existing = map.get(r.user.id);
      if (existing) {
        existing.reportCount++;
      } else {
        map.set(r.user.id, { id: r.user.id, name: r.user.name, reportCount: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [reports]);

  // Filtreli rapor listesi
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      // Stajyer filtresi
      if (internFilter !== "ALL" && r.user.id !== internFilter) return false;
      
      // Tarih filtresi
      if (dateFilter) {
        // r.date UTC Date nesnesidir. Onu YYYY-MM-DD formatına çevirip karşılaştıralım.
        const reportDateStr = new Date(r.date).toISOString().split('T')[0];
        if (reportDateStr !== dateFilter) return false;
      }
      
      return true;
    });
  }, [reports, internFilter, dateFilter]);

  // Stajyere göre grupla
  const grouped = useMemo(() => {
    const map = new Map<string, DailyReportItem[]>();
    for (const r of filtered) {
      const list = map.get(r.user.id) ?? [];
      list.push(r);
      map.set(r.user.id, list);
    }
    return map;
  }, [filtered]);

  const displayInterns =
    internFilter === "ALL" ? interns : interns.filter((i) => i.id === internFilter);
    
  // Tarih filtresi uygulandığında raporu olmayan stajyerleri gizle
  const finalInterns = displayInterns.filter(i => (grouped.get(i.id) ?? []).length > 0);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Raporlar</h1>
          <p className="text-sm text-muted-foreground">
            Toplam {reports.length} günlük rapor
          </p>
        </div>
        {/* Filtreler */}
        <div className="flex gap-3">
          <div className="w-40">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="w-52">
            <Select value={internFilter} onChange={(e) => setInternFilter(e.target.value)}>
              <option value="ALL">Tüm Stajyerler</option>
              {interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Stajyer kartları */}
      {finalInterns.length === 0 ? (
        <EmptyState message="Filtrelere uygun rapor bulunamadı." />
      ) : (
        <div className="space-y-3">
          {finalInterns.map((intern) => {
            const internReports = (grouped.get(intern.id) ?? []).sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const isOpen = expandedIntern === intern.id;

            return (
              <div key={intern.id} className="rounded-lg border bg-card overflow-hidden">
                {/* Accordion başlık */}
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40"
                  onClick={() => setExpandedIntern(isOpen ? null : intern.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{intern.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {internReports.length} rapor
                      </p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </button>

                {/* Rapor satırları */}
                {isOpen && (
                  <div className="border-t divide-y">
                    {internReports.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-muted-foreground">
                        Bu stajyere ait rapor bulunamadı.
                      </p>
                    ) : (
                      internReports.map((report) => (
                        <button
                          key={report.id}
                          className="flex w-full items-start justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/30"
                          onClick={() => setSelectedReport(report)}
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                            {formatDateTR(report.date)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                            <Clock className="size-3" />
                            {formatTimeTR(report.createdAt)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rapor detay modalı */}
      <Modal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? formatDateTR(selectedReport.date) + " — " + selectedReport.user.name : ""}
        description={selectedReport ? "Yazılma saati: " + formatTimeTR(selectedReport.createdAt) : ""}
        className="max-w-xl"
      >
        {selectedReport && (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {selectedReport.content}
            </p>
            {selectedReport.screenshotUrl && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">Ekran Görüntüsü</p>
                <img
                  src={selectedReport.screenshotUrl}
                  alt={selectedReport.screenshotName || "Ekran görüntüsü"}
                  className="rounded-md border object-contain w-full max-h-[400px]"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ================================================================
   STAJYER görünümü
   ================================================================ */

export function InternReportView({
  todayReport,
  pastReports,
}: {
  todayReport: DailyReportItem | null;
  pastReports: DailyReportItem[];
}) {
  const [state, formAction] = useActionState<ReportActionResult | undefined, FormData>(
    createDailyReport,
    undefined
  );
  const [submitted, setSubmitted] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) setSubmitted(true);
  }, [state]);

  const hasWrittenToday = !!todayReport || submitted;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Raporlar</h1>
        <p className="text-sm text-muted-foreground">Günlük çalışma raporlarınız</p>
      </div>

      {/* Bugünkü rapor kutusu */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          <span className="text-sm font-semibold">{getTodayTR()}</span>
          <span className="ml-auto text-xs text-muted-foreground">Bugün</span>
        </div>

        {hasWrittenToday ? (
          /* Rapor yazılmış */
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              <span className="text-sm font-medium">Bugünkü raporunuzu yazdınız.</span>
            </div>
            {todayReport && (
              <div className="rounded-md border bg-muted/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {todayReport.content}
                </p>
                {todayReport.screenshotUrl && (
                  <div className="mt-4">
                    <img
                      src={todayReport.screenshotUrl}
                      alt={todayReport.screenshotName || "Ekran görüntüsü"}
                      className="rounded-md border object-contain max-h-[300px]"
                    />
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatTimeTR(todayReport.createdAt)} itibarıyla gönderildi
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Rapor yazılmamış — form */
          <form action={formAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="content">Rapor İçeriği</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="Bugün neler yaptınız? Tamamladığınız görevleri, karşılaştığınız zorlukları ve öğrendiklerinizi yazabilirsiniz..."
                rows={6}
                className="resize-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="screenshot">Ekran Görüntüsü (Opsiyonel)</Label>
              <input
                id="screenshot"
                name="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/80"
              />
              {fileName && (
                <p className="text-xs text-muted-foreground">Seçilen: {fileName}</p>
              )}
            </div>

            {state?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}
            <div className="flex justify-end">
              <SubmitReportButton />
            </div>
          </form>
        )}
      </div>

      {/* Geçmiş raporlar */}
      {pastReports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Geçmiş Raporlar</h2>
          <div className="space-y-2">
            {pastReports.map((report) => (
              <PastReportCard key={report.id} report={report} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitReportButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <FileText />}
      Raporu Gönder
    </Button>
  );
}

function PastReportCard({ report }: { report: DailyReportItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          {formatDateTR(report.date)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatTimeTR(report.createdAt)}
          </span>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {report.content}
          </p>
          {report.screenshotUrl && (
            <div className="mt-4">
              <img
                src={report.screenshotUrl}
                alt={report.screenshotName || "Ekran görüntüsü"}
                className="rounded-md border object-contain max-h-[300px]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Ortak bileşen ---------- */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <FileText className="size-10 text-muted-foreground/50" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
