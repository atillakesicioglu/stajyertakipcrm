"use client";

import * as React from "react";
import { Chip } from "@heroui/react";
import type { ChipVariants } from "@heroui/styles";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

function getChipColor(variant: BadgeVariant): NonNullable<ChipVariants["color"]> {
  switch (variant) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "destructive":
    case "danger":
      return "danger";
    case "default":
    case "info":
      return "accent";
    default:
      return "default";
  }
}

function getChipVariant(variant: BadgeVariant): NonNullable<ChipVariants["variant"]> {
  switch (variant) {
    case "secondary":
    case "outline":
      return "secondary";
    case "success":
    case "warning":
    case "danger":
    case "info":
      return "soft";
    case "muted":
      return "tertiary";
  }
  return "primary";
}

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children?: React.ReactNode;
}

function Badge({ className, variant = "default", children }: BadgeProps) {
  return (
    <Chip
      color={getChipColor(variant)}
      variant={getChipVariant(variant)}
      size="sm"
      className={cn(className)}
    >
      {children}
    </Chip>
  );
}

function badgeVariants({
  className,
}: {
  variant?: BadgeVariant;
  className?: string;
}) {
  return cn(className);
}

export { Badge, badgeVariants };
