"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealDialog } from "@/components/app/crm/deal-dialog";
import { useClientDeals, useDeleteDeal } from "@/hooks/use-crm";
import { useCan } from "@/app/(app)/session-context";
import { DEAL_STAGE_META, OPEN_STAGES } from "@/lib/constants/crm-options";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import type { Deal } from "@/lib/api/types";

export function DealsPanel({ clientId }: { clientId: string }) {
  const { data: deals, isLoading } = useClientDeals(clientId);
  const del = useDeleteDeal(clientId);
  const { canManage } = useCan();
  const editable = canManage("clients");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Deal | null>(null);

  const openValue = (deals ?? [])
    .filter((d) => OPEN_STAGES.includes(d.stage))
    .reduce((s, d) => s + d.valuePaise, 0);
  const wonValue = (deals ?? [])
    .filter((d) => d.stage === "won")
    .reduce((s, d) => s + d.valuePaise, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Deals</CardTitle>
          {deals && deals.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Open: <b>{formatINR(openValue)}</b> · Won: <b>{formatINR(wonValue)}</b>
            </p>
          )}
        </div>
        {editable && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4" /> New deal
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : !deals || deals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <TrendingUp className="size-6" /> No deals yet.
          </div>
        ) : (
          <ul className="divide-y">
            {deals.map((d) => {
              const meta = DEAL_STAGE_META[d.stage];
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {d.title}
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
                      >
                        {meta.label}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatINR(d.valuePaise)} · {d.probability}%
                      {d.ownerName && ` · ${d.ownerName}`}
                      {d.expectedCloseAt && ` · close ${formatDate(d.expectedCloseAt)}`}
                    </p>
                  </div>
                  {editable && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(d); setOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => del.mutate(d.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <DealDialog open={open} onOpenChange={setOpen} clientId={clientId} deal={editing} />
    </Card>
  );
}
