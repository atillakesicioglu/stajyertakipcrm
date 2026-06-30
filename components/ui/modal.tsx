"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Kapat"
        >
          <X className="size-5" />
        </button>
        {title && (
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
        <div className={cn(title || description ? "mt-4" : "")}>{children}</div>
      </div>
    </div>
  );
}
