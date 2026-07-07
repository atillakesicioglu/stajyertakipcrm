"use client";

import { useCallback } from "react";
import type { TaskActionResult } from "@/lib/actions/tasks";
import {
  useDashboardDataOptional,
  type TaskMutation,
} from "@/components/dashboard-data-provider";

export function useTaskMutationHandler() {
  const dashboard = useDashboardDataOptional();

  return useCallback(
    (result: TaskActionResult) => {
      if (!result.ok) return;

      if (result.taskId && (result.newStatus || result.removed)) {
        const mutation: TaskMutation = {
          taskId: result.taskId,
          newStatus: result.newStatus,
          removed: result.removed,
        };
        dashboard?.applyTaskMutation(mutation);
      }

      void dashboard?.refresh("tasks");
    },
    [dashboard]
  );
}
