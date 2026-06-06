"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Banknote,
  Clock,
  Receipt,
  PiggyBank,
  Percent,
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { ChartCard } from "@/components/app/chart-card";
import { GlassCard } from "@/components/app/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatINRCompact } from "@/lib/money";
import { useFinanceOverview } from "@/hooks/use-finance";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/constants/finance-options";
import type { FinanceOverview } from "@/lib/api/types";

/** A pipeline tile: count + amount, with optional destructive tint. */
function PipelineCard({
  icon: Icon,
  label,
  count,
  amount,
  tone = "default",
}: {
  icon: typeof Clock;
  label: string;
  count: number;
  amount: number;
  tone?: "default" | "destructive" | "success";
}) {
  const toneClass =
    tone === "destructive"
      ? "border-[color-mix(in_srgb,var(--destructive)_30%,var(--glass-border))] bg-[color-mix(in_srgb,var(--destructive)_6%,transparent)]"
      : tone === "success"
        ? "border-[color-mix(in_srgb,var(--success)_28%,var(--glass-border))]"
        : "";
  const iconTone =
    tone === "destructive"
      ? "bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)] text-destructive"
      : tone === "success"
        ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success"
        : "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary";
  return (
    <GlassCard className={cn("p-4", toneClass)}>
      <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
        <span className={cn("grid size-8 place-items-center rounded-md", iconTone)}>
          <Icon className="size-4" />
        </span>
        {label}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="font-display text-2xl font-semibold leading-none tracking-tight">
          {formatINRCompact(amount)}
        </span>
        <span className="text-xs text-muted-foreground">
          {count} invoice{count === 1 ? "" : "s"}
        </span>
      </div>
    </GlassCard>
  );
}

const CATEGORY_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "color-mix(in srgb, var(--primary) 55%, var(--accent))",
  "var(--destructive)",
  "color-mix(in srgb, var(--accent) 60%, var(--muted-foreground))",
  "var(--muted-foreground)",
];

function RevenueByClient({ data }: { data: FinanceOverview }) {
  const rows = data.revenueByClient ?? [];
  const max = Math.max(1, ...rows.map((r) => r.amount));
  if (rows.length === 0) {
    return (
      <div className="grid h-[200px] place-items-center text-sm text-muted-foreground">
        No revenue recorded in this period yet.
      </div>
    );
  }
  return (
    <div className="space-y-3 px-2 py-2">
      {rows.slice(0, 8).map((r) => (
        <div key={r.clientId} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <Link
              href={`/clients/${r.clientId}`}
              className="truncate font-medium hover:text-primary hover:underline"
            >
              {r.clientName}
            </Link>
            <b className="shrink-0 font-semibold tabular-nums">
              {formatINRCompact(r.amount)}
            </b>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(r.amount / max) * 100}%`,
                background:
                  "linear-gradient(90deg,var(--primary),color-mix(in srgb,var(--accent) 60%,var(--primary)))",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpensesByCategory({ data }: { data: FinanceOverview }) {
  const rows = (data.expensesByCategory ?? [])
    .slice()
    .sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (rows.length === 0 || total === 0) {
    return (
      <div className="grid h-[200px] place-items-center text-sm text-muted-foreground">
        No expenses logged in this period.
      </div>
    );
  }
  return (
    <div className="space-y-2.5 px-2 py-2">
      {rows.map((r, i) => {
        const pct = total ? Math.round((r.amount / total) * 100) : 0;
        return (
          <div key={r.category} className="flex items-center gap-3 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
            />
            <span className="flex-1 truncate">
              {EXPENSE_CATEGORY_LABEL[r.category]}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {pct}%
            </span>
            <b className="w-24 shrink-0 text-right font-semibold tabular-nums">
              {formatINRCompact(r.amount)}
            </b>
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t pt-2.5 text-sm">
        <span className="text-muted-foreground">Total expenses</span>
        <b className="font-semibold tabular-nums">{formatINRCompact(total)}</b>
      </div>
    </div>
  );
}

export default function FinanceOverviewPage() {
  const { data, isLoading, error } = useFinanceOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <TrendingUp className="size-3" /> Finance
          </>
        }
        title="Finance overview"
        description="Revenue, collections, outstanding receivables, expenses, and profitability across the agency."
      />

      {error ? (
        <GlassCard className="p-10 text-center text-sm text-muted-foreground">
          Couldn&apos;t load finance overview. Please retry.
        </GlassCard>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {isLoading || !data ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[124px] rounded-lg" />
              ))
            ) : (
              <>
                <KpiCard
                  label="Total revenue"
                  icon={Wallet}
                  value={formatINRCompact(data.totalRevenue)}
                  hint="billed in period"
                />
                <KpiCard
                  label="Collected"
                  icon={Banknote}
                  value={formatINRCompact(data.collected)}
                  hint="payments received"
                />
                <KpiCard
                  label="Outstanding"
                  icon={Clock}
                  value={formatINRCompact(data.outstanding)}
                  hint="awaiting payment"
                />
                <KpiCard
                  label="Expenses"
                  icon={Receipt}
                  value={formatINRCompact(data.expenses)}
                  hint="logged in period"
                />
                <KpiCard
                  label="Net profit"
                  icon={PiggyBank}
                  value={formatINRCompact(data.netProfit)}
                  hint="revenue − expenses"
                />
                <KpiCard
                  label="Margin"
                  icon={Percent}
                  value={`${data.marginPct.toFixed(1)}%`}
                  hint="net margin"
                />
              </>
            )}
          </div>

          {/* Invoice pipeline */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Invoice pipeline
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading || !data ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[104px] rounded-lg" />
                ))
              ) : (
                <>
                  <PipelineCard
                    icon={AlertTriangle}
                    label="Overdue"
                    count={data.pipeline.overdue.count}
                    amount={data.pipeline.overdue.amount}
                    tone="destructive"
                  />
                  <PipelineCard
                    icon={CalendarClock}
                    label="Due this week"
                    count={data.pipeline.dueThisWeek.count}
                    amount={data.pipeline.dueThisWeek.amount}
                  />
                  <PipelineCard
                    icon={CalendarRange}
                    label="Due this month"
                    count={data.pipeline.dueThisMonth.count}
                    amount={data.pipeline.dueThisMonth.amount}
                  />
                  <PipelineCard
                    icon={CheckCircle2}
                    label="Paid this month"
                    count={data.pipeline.paidThisMonth.count}
                    amount={data.pipeline.paidThisMonth.amount}
                    tone="success"
                  />
                </>
              )}
            </div>
          </section>

          {/* Breakdowns */}
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <ChartCard
              title="Revenue by client"
              description="Top clients by amount billed in this period"
              isLoading={isLoading || !data}
            >
              {data && <RevenueByClient data={data} />}
            </ChartCard>
            <ChartCard
              title="Expenses by category"
              description="Where the money went"
              isLoading={isLoading || !data}
            >
              {data && <ExpensesByCategory data={data} />}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
