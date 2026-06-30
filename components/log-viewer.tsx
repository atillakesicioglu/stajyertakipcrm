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
import { ACTION_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type LogItem = {
  id: string;
  action: string;
  page: string | null;
  details: string | null;
  createdAt: Date;
  user: { name: string };
};

const ACTION_BADGE: Record<string, "info" | "success" | "warning" | "danger" | "muted"> = {
  LOGIN: "success",
  LOGOUT: "muted",
  PAGE_VIEW: "muted",
  CREATE_INTERN: "info",
  DELETE_INTERN: "danger",
  ASSIGN_TASK: "info",
  START_TASK: "warning",
  SUBMIT_TASK: "info",
  APPROVE_TASK: "success",
  REQUEST_REVISION: "danger",
};

export function LogViewer({ logs }: { logs: LogItem[] }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))),
    [logs]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return logs.filter((l) => {
      if (actionFilter !== "ALL" && l.action !== actionFilter) return false;
      if (!q) return true;
      return (
        l.user.name.toLowerCase().includes(q) ||
        (l.details ?? "").toLowerCase().includes(q) ||
        (l.page ?? "").toLowerCase().includes(q)
      );
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loglar</h1>
        <p className="text-sm text-muted-foreground">
          Kullanıcı aktiviteleri ({filtered.length} kayıt)
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Input
            placeholder="Kullanıcı veya detay ara..."
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
            {actions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Aksiyon</TableHead>
              <TableHead>Detay</TableHead>
              <TableHead>Zaman</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.user.name}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_BADGE[log.action] ?? "muted"}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.details ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
