"use client";

import * as React from "react";
import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";
import {
  CalendarDays,
  Clock,
  Sparkles,
  Users,
  Wallet,
  TrendingDown,
  Receipt,
  ListTodo,
} from "lucide-react";

import { KpiCard } from "@/components/app/kpi-card";
import { ChartCard } from "@/components/app/chart-card";
import { GlassCard } from "@/components/app/glass-card";
import { SectionCard } from "@/components/app/dashboard/shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/use-dashboard";
import { useFinanceOverview } from "@/hooks/use-finance";
import { useAllTasks } from "@/hooks/use-all-tasks";
import { useCan, useIsOwner } from "@/app/(app)/session-context";
import { formatINR } from "@/lib/money";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/constants/finance-options";
import type { ExpenseCategory } from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Content-pipeline status palette (unchanged from the original page). */
/* ------------------------------------------------------------------ */

const STATUS_META: Array<{
  key:
    | "posted"
    | "scheduled"
    | "approved"
    | "pending_approval"
    | "draft"
    | "changes_requested";
  name: string;
  color: string;
}> = [
  { key: "posted", name: "Posted", color: "var(--success)" },
  { key: "scheduled", name: "Scheduled", color: "var(--accent)" },
  { key: "approved", name: "Approved", color: "var(--primary)" },
  { key: "pending_approval", name: "Pending", color: "var(--warning)" },
  { key: "changes_requested", name: "Changes", color: "var(--destructive)" },
  { key: "draft", name: "Draft", color: "var(--muted-foreground)" },
];

/* Ordered token palette for the spend-category bars. */
const SPEND_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--warning)",
  "#2f7fb8",
  "#7c5cbf",
  "var(--muted-foreground)",
];

/* ------------------------------------------------------------------ */
/* Admin / Owner dashboard — agency KPIs + content pipeline + finance  */
/* ------------------------------------------------------------------ */

export function AdminDashboard() {
  const { data, isLoading } = useDashboard();
  const isOwner = useIsOwner();
  const { data: recentTasks = [], isLoading: tasksLoading } = useAllTasks();

  const statusData = React.useMemo(() => {
    if (!data) return [];
    return STATUS_META.map((s) => ({
      ...s,
      value: data.postsByStatus[s.key] ?? 0,
    })).filter((s) => s.value > 0);
  }, [data]);

  const total = statusData.reduce((s, d) => s + d.value, 0);
  const aiLimit = data?.ai.limit ?? null;
  const aiUsed = data?.ai.used ?? 0;
  const aiLeft = aiLimit != null ? Math.max(aiLimit - aiUsed, 0) : null;

  return (
    <div className="space-y-6">
      {/* Agency KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active clients"
          icon={Users}
          value={data?.totals.clients ?? "—"}
          hint="in your agency"
        />
        <KpiCard
          label="Scheduled"
          icon={CalendarDays}
          value={data?.postsByStatus.scheduled ?? "—"}
          hint="queued to post"
        />
        <KpiCard
          label="Pending approval"
          icon={Clock}
          value={data?.postsByStatus.pending_approval ?? "—"}
          hint="awaiting client review"
        />
        <KpiCard
          label="AI credits"
          icon={Sparkles}
          value={
            aiLimit != null ? (
              aiLimit > 0 ? (
                <>
                  {aiLeft}
                  <span className="text-base text-muted-foreground">
                    {" "}
                    / {aiLimit}
                  </span>
                </>
              ) : (
                "∞"
              )
            ) : (
              "—"
            )
          }
          hint={data?.usageUnavailable ? "owner only" : "this period"}
        />
      </div>

      {/* Finance KPI strip — strictly owner only */}
      {isOwner && <FinanceStrip />}

      {/* Content pipeline */}
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <ChartCard
          title="Content pipeline"
          description="Every post across your clients, by status"
          isLoading={isLoading}
        >
          {statusData.length > 0 ? (
            <div className="space-y-3 py-2">
              {statusData.map((d) => (
                <div key={d.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-sm"
                        style={{ background: d.color }}
                      />
                      {d.name}
                    </span>
                    <b className="font-semibold">{d.value}</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: total ? `${(d.value / total) * 100}%` : "0%",
                        background: d.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                {data?.totals.posts ?? total} posts total
              </p>
            </div>
          ) : (
            <div className="grid h-[220px] place-items-center text-sm text-muted-foreground">
              No posts yet.
            </div>
          )}
        </ChartCard>

        <ChartCard title="By status" description="Distribution" isLoading={isLoading}>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ChartContainer
                config={{}}
                className="aspect-square h-[180px] w-[180px]"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={78}
                    strokeWidth={3}
                    stroke="var(--card)"
                  >
                    {statusData.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((d) => (
                  <div key={d.key} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{ background: d.color }}
                    />
                    {d.name}
                    <b className="ml-auto font-semibold">{d.value}</b>
                  </div>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">
                  {total} posts total
                </p>
              </div>
            </div>
          ) : (
            <div className="grid h-[180px] place-items-center text-sm text-muted-foreground">
              No data.
            </div>
          )}
        </ChartCard>
      </div>

      {/* Agency Tasks Overview */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-white">Active Agency Deliverables</h3>
          </div>
          <Link
            href="/tasks"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            View All Tasks &rarr;
          </Link>
        </div>

        {tasksLoading ? (
          <div className="py-8 text-center text-xs text-neutral-500">Loading tasks...</div>
        ) : recentTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">No active tasks right now.</div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {recentTasks.slice(0, 6).map((tk) => (
              <Link
                key={tk.id}
                href={`/projects/${tk.projectId}?tab=tasks&task=${tk.id}`}
                className="group flex flex-col justify-between p-3 rounded-lg border border-neutral-800/80 bg-neutral-900 hover:border-neutral-700 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-neutral-200 group-hover:text-primary transition-colors line-clamp-1">
                      {tk.title}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider shrink-0 bg-neutral-800 text-neutral-300">
                      {tk.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {tk.projectName}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-2 mt-2 border-t border-neutral-800/60">
                  <span>{tk.assigneeName || "Unassigned"}</span>
                  {tk.dueDate && <span>Due {new Date(tk.dueDate).toLocaleDateString()}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {data?.usageUnavailable && (
        <GlassCard className="p-4 text-sm text-muted-foreground">
          Some agency-wide metrics (AI usage, storage) are visible to owners only.
        </GlassCard>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Finance strip — expenses, net profit, top spend categories          */
/* ------------------------------------------------------------------ */

function FinanceStrip() {
  const { data, isLoading } = useFinanceOverview();

  const netNegative = (data?.netProfit ?? 0) < 0;
  const topCategories = React.useMemo(() => {
    const rows = [...(data?.expensesByCategory ?? [])].sort(
      (a, b) => b.amount - a.amount,
    );
    return rows.slice(0, 5);
  }, [data]);
  const maxSpend = topCategories[0]?.amount ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Wallet className="size-3.5 text-primary" /> Finance
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.6fr]">
        <KpiCard
          label="Expenses"
          icon={Receipt}
          value={isLoading ? "—" : formatINR(data?.expenses ?? 0)}
          hint="this period"
        />
        <KpiCard
          label="Net profit"
          icon={TrendingDown}
          value={
            isLoading ? (
              "—"
            ) : (
              <span className={netNegative ? "text-destructive" : "text-success"}>
                {formatINR(data?.netProfit ?? 0)}
              </span>
            )
          }
          hint="revenue − expenses"
        />
        <SectionCard
          title="Top spend"
          description="By category"
          icon={Wallet}
          isLoading={isLoading}
          loadingRows={3}
          isEmpty={!isLoading && topCategories.length === 0}
          emptyIcon={Wallet}
          emptyText="No expenses recorded this period."
          bodyClassName="px-5 pb-4 pt-0"
        >
          <ul className="space-y-2.5">
            {topCategories.map((c, i) => (
              <li key={c.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{ background: SPEND_COLORS[i % SPEND_COLORS.length] }}
                    />
                    {EXPENSE_CATEGORY_LABEL[c.category as ExpenseCategory] ??
                      c.category}
                  </span>
                  <b className="font-semibold tabular-nums">
                    {formatINR(c.amount)}
                  </b>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: maxSpend ? `${(c.amount / maxSpend) * 100}%` : "0%",
                      background: SPEND_COLORS[i % SPEND_COLORS.length],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
