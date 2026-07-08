"use client";

import { useCallback } from "react";
import type { OfficeActionResult } from "@/lib/actions/office-tasks";
import { useDashboardDataOptional } from "@/components/dashboard-data-provider";

export function useOfficeMutationHandler() {
  const dashboard = useDashboardDataOptional();

  return useCallback(
    (result: OfficeActionResult, assignmentId?: string) => {
      if (!result.ok) return;

      const id = assignmentId ?? result.assignmentId;
      if (id) {
        dashboard?.applyOfficeMutation({ assignmentId: id, completed: true });
      }

      void dashboard?.refresh("office");
    },
    [dashboard]
  );
}
