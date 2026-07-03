"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACTION_CATEGORY_LABELS,
  getActionConfig,
  type ActionCategory,
} from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

type LogItem = {
  id: string;
  action: string;
  page: string | null;
  details: string | null;
  createdAt: Date;
  user: { name: string };
};

const CATEGORY_ORDER: ActionCategory[] = [
  "oturum",
  "gezinti",
  "gorev",
  "stajyer",
  "ofis",
  "rapor",
];

const CATEGORY_CHIP_CLASS: Record<ActionCategory, string> = {
  oturum:
    "border-emerald-200 bg-emerald-500/15 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400",
  gezinti:
    "border-violet-200 bg-violet-500/15 text-violet-700 dark:border-violet-900 dark:text-violet-400",
  gorev:
    "border-blue-200 bg-blue-500/15 text-blue-700 dark:border-blue-900 dark:text-blue-400",
  stajyer:
    "border-orange-200 bg-orange-500/15 text-orange-700 dark:border-orange-900 dark:text-orange-400",
  ofis:
    "border-cyan-200 bg-cyan-500/15 text-cyan-700 dark:border-cyan-900 dark:text-cyan-400",
  rapor:
    "border-pink-200 bg-pink-500/15 text-pink-700 dark:border-pink-900 dark:text-pink-400",
};

function CategoryChip({
  category,
  className,
}: {
  category: ActionCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        CATEGORY_CHIP_CLASS[category],
        className
      )}
    >
      {ACTION_CATEGORY_LABELS[category]}
    </span>
  );
}

export function LogViewer({ logs }: { logs: LogItem[] }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState<ActionCategory | "ALL">(
    "ALL"
  );

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return logs.filter((l) => {
      const config = getActionConfig(l.action);
      if (categoryFilter !== "ALL" && config.category !== categoryFilter) {
        return false;
      }
      if (actionFilter !== "ALL" && l.action !== actionFilter) return false;
      if (!q) return true;
      return (
        l.user.name.toLowerCase().includes(q) ||
        config.label.toLowerCase().includes(q) ||
        ACTION_CATEGORY_LABELS[config.category].toLowerCase().includes(q) ||
        (l.details ?? "").toLowerCase().includes(q) ||
        (l.page ?? "").toLowerCase().includes(q)
      );
    });
  }, [logs, search, actionFilter, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(
      CATEGORY_ORDER.map((c) => [c, 0])
    ) as Record<ActionCategory, number>;
    for (const log of logs) {
      counts[getActionConfig(log.action).category]++;
    }
    return counts;
  }, [logs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loglar</h1>
        <p className="text-sm text-muted-foreground">
          Kullanıcı aktiviteleri ({filtered.length} kayıt)
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Kategoriler
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              categoryFilter === "ALL"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            Tümü ({logs.length})
          </button>
          {CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() =>
                setCategoryFilter((c) => (c === category ? "ALL" : category))
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-opacity",
                CATEGORY_CHIP_CLASS[category],
                categoryFilter === category && "ring-2 ring-primary ring-offset-2"
              )}
            >
              {ACTION_CATEGORY_LABELS[category]} ({categoryCounts[category]})
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Kullanıcı, aksiyon veya detay ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-52">
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="ALL">Tüm Aksiyonlar</option>
            {actions.map((a) => {
              const config = getActionConfig(a);
              return (
                <option key={a} value={a}>
                  [{ACTION_CATEGORY_LABELS[config.category]}] {config.label}
                </option>
              );
            })}
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Aksiyon</TableHead>
              <TableHead>Detay</TableHead>
              <TableHead>Zaman</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => {
                const config = getActionConfig(log.action);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.user.name}</TableCell>
                    <TableCell>
                      <CategoryChip category={config.category} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-muted-foreground">
                      {log.details ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
