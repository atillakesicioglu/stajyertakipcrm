"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GamificationData } from "@/lib/queries/gamification";
import type { getTasksBoardData } from "@/lib/queries/tasks-board";
import type { getOfficeTasksBoardData } from "@/lib/queries/office-tasks-board-data";
import type { TaskStatus } from "@prisma/client";
import type { TaskData } from "@/lib/types";

export type TasksBoardData = Awaited<ReturnType<typeof getTasksBoardData>>;
export type OfficeBoardData = Awaited<ReturnType<typeof getOfficeTasksBoardData>>;

export type BoardKey = "tasks" | "office" | "gamification";

export type TaskMutation = {
  taskId: string;
  newStatus?: TaskStatus;
  removed?: boolean;
};

export type OfficeMutation = {
  assignmentId: string;
  completed: boolean;
};

type Cache = {
  tasks?: TasksBoardData;
  tasksLight?: TasksBoardData;
  office?: OfficeBoardData;
  officePreview?: OfficeBoardData;
  gamification?: GamificationData;
};

type LoadingState = Record<BoardKey, boolean>;

type DashboardDataContextValue = {
  cache: Cache;
  loading: LoadingState;
  initialLoad: boolean;
  refresh: (key: BoardKey | "all") => Promise<void>;
  applyTaskMutation: (mutation: TaskMutation) => void;
  applyOfficeMutation: (mutation: OfficeMutation) => void;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(
  null
);

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json() as Promise<T>;
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Cache>({});
  const [loading, setLoading] = useState<LoadingState>({
    tasks: true,
    office: true,
    gamification: true,
  });
  const [initialLoad, setInitialLoad] = useState(true);
  const startedRef = useRef(false);

  const refresh = useCallback(async (key: BoardKey | "all") => {
    const keys = key === "all" ? (["tasks", "office", "gamification"] as const) : [key];

    setLoading((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = true;
      return next;
    });

    try {
      if (keys.includes("tasks")) {
        const [tasks, tasksLight] = await Promise.all([
          fetchJson<TasksBoardData>("/api/board/tasks"),
          fetchJson<TasksBoardData>("/api/board/tasks?light=true"),
        ]);
        setCache((c) => ({ ...c, tasks, tasksLight }));
      }

      if (keys.includes("office")) {
        const office = await fetchJson<OfficeBoardData>(
          "/api/board/office-tasks?sync=true"
        );
        setCache((c) => ({ ...c, office, officePreview: office }));
      }

      if (keys.includes("gamification")) {
        const gamification = await fetchJson<GamificationData>(
          "/api/board/gamification"
        );
        setCache((c) => ({ ...c, gamification }));
      }
    } finally {
      setLoading((prev) => {
        const next = { ...prev };
        for (const k of keys) next[k] = false;
        return next;
      });
      setInitialLoad(false);
    }
  }, []);

  const applyTaskMutation = useCallback((mutation: TaskMutation) => {
    const patchTasks = (tasks: TaskData[]) => {
      if (mutation.removed) {
        return tasks.filter((t) => t.id !== mutation.taskId);
      }
      if (mutation.newStatus) {
        return tasks.map((t) =>
          t.id === mutation.taskId ? { ...t, status: mutation.newStatus! } : t
        );
      }
      return tasks;
    };

    setCache((c) => ({
      ...c,
      tasks: c.tasks
        ? { ...c.tasks, tasks: patchTasks(c.tasks.tasks) }
        : c.tasks,
      tasksLight: c.tasksLight
        ? { ...c.tasksLight, tasks: patchTasks(c.tasksLight.tasks) }
        : c.tasksLight,
    }));
  }, []);

  const applyOfficeMutation = useCallback((mutation: OfficeMutation) => {
    const patchOffice = (data: OfficeBoardData): OfficeBoardData => ({
      ...data,
      assignments: data.assignments.map((a) =>
        a.id === mutation.assignmentId
          ? { ...a, completed: mutation.completed }
          : a
      ),
    });

    setCache((c) => ({
      ...c,
      office: c.office ? patchOffice(c.office) : c.office,
      officePreview: c.officePreview ? patchOffice(c.officePreview) : c.officePreview,
    }));
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void refresh("all");
  }, [refresh]);

  return (
    <DashboardDataContext.Provider
      value={{ cache, loading, initialLoad, refresh, applyTaskMutation, applyOfficeMutation }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return ctx;
}

export function useDashboardDataOptional() {
  return useContext(DashboardDataContext);
}
