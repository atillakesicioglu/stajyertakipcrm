"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
  iconBg,
  trend,
  className,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  iconBg: string;
  trend?: { positive: boolean; label: string };
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center p-4 text-center">
        <div className={cn("rounded-xl p-3", iconBg)}>
          <Icon className={cn("size-6", iconClass)} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {trend && (
          <p
            className={cn(
              "mt-1 flex items-center justify-center gap-0.5 text-xs font-medium",
              trend.positive ? "text-emerald-600" : "text-red-500"
            )}
          >
            {trend.positive ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
