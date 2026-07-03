"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ClipboardList,
  CheckCircle2,
  RotateCcw,
  BadgeCheck,
  Percent,
  Clock,
  TrendingUp,
  TrendingDown,
  FileDown,
  FileSpreadsheet,
  User,
} from "lucide-react";
import type { ReportsAnalytics } from "@/lib/queries/reports-analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from "@/lib/utils";

type Props = {
  analytics: ReportsAnalytics;
  dailyNotesSlot?: React.ReactNode;
};

export function AdminAnalyticsDashboard({ analytics, dailyNotesSlot }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"analytics" | "notes">("analytics");
  const [from, setFrom] = useState(analytics.range.from);
  const [to, setTo] = useState(analytics.range.to);

  function applyRange() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from);
    params.set("to", to);
    startTransition(() => {
      router.push(`/raporlar?${params.toString()}`);
    });
  }

  function exportCsv() {
    const rows = [
      [
        "Stajyer",
        "Tamamlanan",
        "Revize",
        "Onaylanan",
        "Onay Oranı",
        "Ort. Süre (gün)",
      ],
      ...analytics.internDetails.map((r) => [
        r.name,
        r.completed,
        r.revised,
        r.approved,
        r.approvalRate.toFixed(1),
        r.avgResponseDays.toFixed(1),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raporlar-${analytics.range.from}-${analytics.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Raporlar</h1>
          <p className="text-sm text-muted-foreground">
            Performans metriklerini inceleyin, analiz edin ve içgörülerinizi
            dışa aktarın.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-36"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-36"
          />
          <Button onClick={applyRange} disabled={isPending} size="sm">
            Uygula
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileSpreadsheet className="size-4 text-emerald-600" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileDown className="size-4 text-red-500" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("analytics")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === "analytics"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Performans Analizi
        </button>
        <button
          onClick={() => setTab("notes")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === "notes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Günlük Notlar
        </button>
      </div>

      {tab === "notes" ? (
        dailyNotesSlot
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <KpiCard
              title="Toplam Görev"
              value={analytics.kpis.totalTasks.value}
              change={analytics.kpis.totalTasks.changePercent}
              icon={ClipboardList}
              color="text-blue-600"
              bg="bg-blue-500/10"
            />
            <KpiCard
              title="Tamamlanan Görev"
              value={analytics.kpis.completedTasks.value}
              change={analytics.kpis.completedTasks.changePercent}
              icon={CheckCircle2}
              color="text-emerald-600"
              bg="bg-emerald-500/10"
            />
            <KpiCard
              title="Revize Edilen"
              value={analytics.kpis.revisedTasks.value}
              change={analytics.kpis.revisedTasks.changePercent}
              icon={RotateCcw}
              color="text-violet-600"
              bg="bg-violet-500/10"
            />
            <KpiCard
              title="Onaylanan"
              value={analytics.kpis.approvedTasks.value}
              change={analytics.kpis.approvedTasks.changePercent}
              icon={BadgeCheck}
              color="text-amber-600"
              bg="bg-amber-500/10"
            />
            <KpiCard
              title="Onaylanma Oranı"
              value={`%${analytics.kpis.approvalRate.value.toFixed(1)}`}
              change={analytics.kpis.approvalRate.changePercent}
              icon={Percent}
              color="text-teal-600"
              bg="bg-teal-500/10"
              isPercent
            />
            <KpiCard
              title="Ortalama Süre"
              value={`${analytics.kpis.avgDurationDays.value.toFixed(1)} gün`}
              change={analytics.kpis.avgDurationDays.changePercent}
              icon={Clock}
              color="text-pink-600"
              bg="bg-pink-500/10"
              invertTrend
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GaugeCard
              title="Görev Tamamlama Oranı"
              percent={analytics.completionRate}
              subtitle={`${analytics.kpis.completedTasks.value} / ${analytics.kpis.totalTasks.value} görev`}
              color="#22c55e"
            />
            <GaugeCard
              title="Revize Oranı"
              percent={analytics.revisionRate}
              subtitle={`${analytics.kpis.revisedTasks.value} / ${analytics.kpis.totalTasks.value} görev`}
              color="#ec4899"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Görev Durum Dağılımı</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-6">
                <DonutChart data={analytics.statusDistribution} />
                <div className="min-w-[160px] flex-1 space-y-2">
                  {analytics.statusDistribution
                    .filter((s) => s.count > 0)
                    .map((s) => (
                      <div
                        key={s.status}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span>{s.label}</span>
                        </div>
                        <span className="font-medium">
                          {s.count}{" "}
                          <span className="text-muted-foreground">
                            (%{s.percent.toFixed(1)})
                          </span>
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Haftalık Aktivite Trendi</CardTitle>
                <CardDescription>
                  Oluşturulan vs tamamlanan görevler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart data={analytics.weeklyTrend} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Stajyer Performans Sıralaması
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.internRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Bu dönemde veri yok.
                  </p>
                ) : (
                  analytics.internRanking.map((intern, i) => (
                    <div key={intern.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {i + 1}. {intern.name}
                        </span>
                        <span className="text-muted-foreground">
                          %{intern.approvalRate.toFixed(0)} onay
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${(intern.completed / intern.maxCompleted) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {intern.completed} tamamlanan görev
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Günlük Not Gönderim İstatistikleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={analytics.dailyNoteStats} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detaylı Rapor Tablosu</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stajyer</TableHead>
                    <TableHead>Tamamlanan</TableHead>
                    <TableHead>Revize</TableHead>
                    <TableHead>Onaylanan</TableHead>
                    <TableHead>Onay Oranı</TableHead>
                    <TableHead>Ort. Süre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.internDetails.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="size-4" />
                          </div>
                          <span className="font-medium">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{row.completed}</TableCell>
                      <TableCell>{row.revised}</TableCell>
                      <TableCell>{row.approved}</TableCell>
                      <TableCell>%{row.approvalRate.toFixed(1)}</TableCell>
                      <TableCell>{row.avgResponseDays.toFixed(1)} gün</TableCell>
                    </TableRow>
                  ))}
                  {analytics.internDetails.length > 0 && (
                    <TableRow className="bg-muted/30 font-medium">
                      <TableCell>Toplam</TableCell>
                      <TableCell>{analytics.totals.completed}</TableCell>
                      <TableCell>{analytics.totals.revised}</TableCell>
                      <TableCell>{analytics.totals.approved}</TableCell>
                      <TableCell>
                        %{analytics.totals.approvalRate.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        {analytics.totals.avgResponseDays.toFixed(1)} gün
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  bg,
  isPercent,
  invertTrend,
}: {
  title: string;
  value: number | string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  isPercent?: boolean;
  invertTrend?: boolean;
}) {
  const positive = invertTrend ? change < 0 : change > 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn("rounded-lg p-2", bg)}>
            <Icon className={cn("size-5", color)} />
          </div>
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              positive ? "text-emerald-600" : "text-red-500"
            )}
          >
            <TrendIcon className="size-3.5" />
            {isPercent && !String(value).startsWith("%")
              ? `%${Math.abs(change).toFixed(1)}`
              : `%${Math.abs(change).toFixed(0)}`}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function GaugeCard({
  title,
  percent,
  subtitle,
  color,
}: {
  title: string;
  percent: number;
  subtitle: string;
  color: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const angle = (clamped / 100) * 180;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-6">
        <div className="relative size-40">
          <svg viewBox="0 0 120 70" className="w-full">
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted/30"
            />
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeDasharray={`${(angle / 180) * 157} 157`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <span className="text-3xl font-bold">%{clamped.toFixed(1)}</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function DonutChart({
  data,
}: {
  data: { label: string; count: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  let offset = 0;
  const r = 40;
  const c = 2 * Math.PI * r;

  return (
    <svg width="140" height="140" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
      {data.map((d) => {
        const len = (d.count / total) * c;
        const el = (
          <circle
            key={d.label}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="14"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += len;
        return el;
      })}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground text-[10px] font-bold"
      >
        {total}
      </text>
    </svg>
  );
}

function LineChart({
  data,
}: {
  data: { label: string; created: number; completed: number }[];
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.completed]));
  const w = 320;
  const h = 120;
  const pad = 20;

  const points = (key: "created" | "completed") =>
    data
      .map((d, i) => {
        const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
        const y = h - pad - (d[key] / max) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full min-w-[280px]">
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={points("created")}
        />
        <polyline
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          points={points("completed")}
        />
        {data.map((d, i) => {
          const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
          return (
            <text
              key={d.label}
              x={x}
              y={h + 14}
              textAnchor="middle"
              className="fill-muted-foreground text-[8px]"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-blue-500" />
          Oluşturulan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Tamamlanan
        </span>
      </div>
    </div>
  );
}

function BarChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = Math.max(1, Math.floor(data.length / 12));

  return (
    <div className="flex h-36 items-end gap-1 overflow-x-auto pb-6">
      {data.map((d, i) =>
        i % step === 0 || i === data.length - 1 ? (
          <div key={d.label} className="flex min-w-[18px] flex-1 flex-col items-center gap-1">
            <div
              className="w-full min-w-[12px] rounded-t bg-primary/80 transition-all"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
              title={`${d.label}: ${d.count}`}
            />
            <span className="rotate-[-45deg] text-[8px] text-muted-foreground whitespace-nowrap origin-top-left translate-y-2">
              {d.label}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}
