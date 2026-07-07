"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Yenile
    </Button>
  );
}
