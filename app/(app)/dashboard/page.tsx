"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Sparkles,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { ChartCard } from "@/components/app/chart-card";
import { GlassCard } from "@/components/app/glass-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useDashboard } from "@/hooks/use-dashboard";
import { useSession } from "../session-context";

const STATUS_META: Array<{
  key: "posted" | "scheduled" | "approved" | "pending_approval" | "draft" | "changes_requested";
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

export default function DashboardPage() {
  const session = useSession();
  const { data, isLoading } = useDashboard();

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
      <PageHeader
        kicker={
          <>
            <Sparkles className="size-3" /> Overview
          </>
        }
        title={`Welcome${session.user.fullName ? `, ${session.user.fullName}` : ""}`}
        description="Plan the month, send posts for approval, and share a branded read-only portal. Light & dark, six themes, all glass."
      />

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
          hint="awaiting client"
        />
        <KpiCard
          label="AI credits left"
          icon={Sparkles}
          value={
            data ? (
              aiLeft != null ? (
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
          hint={data?.usageUnavailable ? "owner/admin only" : "this period"}
        />
      </div>

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

      {data?.usageUnavailable && (
        <GlassCard className="p-4 text-sm text-muted-foreground">
          Some agency-wide metrics (AI usage, storage) are visible to owners and
          admins only.
        </GlassCard>
      )}
    </div>
  );
}
