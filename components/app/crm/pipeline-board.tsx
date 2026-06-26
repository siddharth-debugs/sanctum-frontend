"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/app/glass-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DealDialog } from "@/components/app/crm/deal-dialog";
import { usePipeline, useUpdateDeal } from "@/hooks/use-crm";
import { useCan } from "@/app/(app)/session-context";
import { DEAL_STAGES, OPEN_STAGES } from "@/lib/constants/crm-options";
import { formatINR } from "@/lib/money";
import type { Deal, DealStage } from "@/lib/api/types";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function PipelineBoard() {
  const { data: deals, isLoading } = usePipeline();
  const update = useUpdateDeal();
  const { canManage } = useCan();
  const editable = canManage("clients");

  const [editing, setEditing] = React.useState<Deal | null>(null);
  const [open, setOpen] = React.useState(false);

  const byStage = React.useMemo(() => {
    const map: Record<DealStage, Deal[]> = {
      lead: [], qualified: [], proposal: [], negotiation: [], won: [], lost: [],
    };
    for (const d of deals ?? []) map[d.stage].push(d);
    return map;
  }, [deals]);

  const all = deals ?? [];
  const openValue = all.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((s, d) => s + d.valuePaise, 0);
  const weighted = all
    .filter((d) => OPEN_STAGES.includes(d.stage))
    .reduce((s, d) => s + Math.round((d.valuePaise * d.probability) / 100), 0);
  const wonValue = all.filter((d) => d.stage === "won").reduce((s, d) => s + d.valuePaise, 0);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Open pipeline" value={formatINR(openValue)} />
        <StatTile label="Weighted (by probability)" value={formatINR(weighted)} />
        <StatTile label="Won" value={formatINR(wonValue)} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {DEAL_STAGES.map((stage) => {
          const items = byStage[stage.value];
          const total = items.reduce((s, d) => s + d.valuePaise, 0);
          return (
            <GlassCard key={stage.value} className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="size-2 rounded-full" style={{ background: stage.color }} />
                  {stage.label}
                </span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">{formatINR(total)}</p>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted-foreground">—</p>
                ) : (
                  items.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-lg border bg-card p-2.5 text-left"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => editable && (setEditing(d), setOpen(true))}
                        >
                          <p className="truncate text-xs font-semibold">{d.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{d.clientName}</p>
                        </button>
                        {editable && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs">Move to</DropdownMenuLabel>
                              {DEAL_STAGES.filter((s) => s.value !== d.stage).map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  onClick={() => update.mutate({ id: d.id, stage: s.value })}
                                >
                                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                                  {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] font-medium tabular-nums">{formatINR(d.valuePaise)}</p>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      <DealDialog open={open} onOpenChange={setOpen} deal={editing} />
    </div>
  );
}
