import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ChartCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  toolbar?: React.ReactNode;
  isLoading?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  className,
  trend,
  toolbar,
  isLoading,
  footer,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("glass gap-0 overflow-hidden border-0 py-0", className)}>
      <span aria-hidden className="glass-noise" />
      <div className="relative flex items-start gap-3 px-5 pt-5 pb-2">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                trend.direction === "up" &&
                  "text-success bg-[color-mix(in_srgb,var(--success)_15%,transparent)]",
                trend.direction === "down" &&
                  "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
                trend.direction === "flat" &&
                  "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)]",
              )}
            >
              {trend.direction === "up" && <TrendingUp className="size-3" />}
              {trend.direction === "down" && <TrendingDown className="size-3" />}
              {trend.direction === "flat" && <Minus className="size-3" />}
              {trend.value}
            </span>
          )}
          {toolbar}
        </div>
      </div>
      <div className="relative px-3 pb-4">
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          children
        )}
      </div>
      {footer && (
        <div className="relative border-t px-5 py-3 text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </Card>
  );
}
