"use client";

import { Skeleton as HeroSkeleton } from "@heroui/react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <HeroSkeleton
      className={cn(className)}
      {...props}
    />
  );
}
