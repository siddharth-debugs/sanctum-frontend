"use client";

import * as React from "react";
import { TrendingUp, Receipt, PiggyBank } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { ChartCard } from "@/components/app/chart-card";
import { GlassCard } from "@/components/app/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINRCompact } from "@/lib/money";
import { useFinanceOverview } from "@/hooks/use-finance";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/constants/finance-options";
import type { FinanceOverview } from "@/lib/api/types";

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
        description="Expenses and profitability across the agency."
      />

      {error ? (
        <GlassCard className="p-10 text-center text-sm text-muted-foreground">
          Couldn&apos;t load finance overview. Please retry.
        </GlassCard>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {isLoading || !data ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[124px] rounded-lg" />
              ))
            ) : (
              <>
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
                  hint="− expenses"
                />
              </>
            )}
          </div>

          {/* Breakdowns */}
          <div className="grid gap-4">
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
