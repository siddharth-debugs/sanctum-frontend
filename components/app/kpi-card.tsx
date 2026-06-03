import * as React from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { GlassCard } from "./glass-card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  delta?: { value: string; direction: "up" | "down" };
  hint?: string;
}

export function KpiCard({ label, value, icon: Icon, delta, hint }: KpiCardProps) {
  return (
    <GlassCard className="p-5 border-[color-mix(in_srgb,var(--accent)_18%,var(--glass-border))]">
      <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
          <Icon className="size-4" />
        </span>
        {label}
      </div>
      <div className="mt-3.5 font-display text-3xl font-semibold leading-none tracking-tight">
        {value}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold",
              delta.direction === "up"
                ? "text-success bg-[color-mix(in_srgb,var(--success)_15%,transparent)]"
                : "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
            )}
          >
            {delta.direction === "up" ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {delta.value}
          </span>
        )}
        {hint}
      </div>
    </GlassCard>
  );
}
