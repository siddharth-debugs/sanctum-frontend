"use client";

import Link from "next/link";
import { CalendarClock, AlertCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFollowUps } from "@/hooks/use-crm";
import { initials, formatDate } from "@/lib/utils";

export function FollowUpsCard() {
  const { data, isLoading } = useFollowUps();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" /> Follow-ups
          <span className="text-xs font-normal text-muted-foreground">next 14 days</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No follow-ups due. Set a next-follow-up date on a client to plan one.
          </p>
        ) : (
          <ul className="divide-y">
            {data.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/clients/${f.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
                      style={{ background: f.brandColor ?? "var(--primary)" }}
                    >
                      {initials(f.name)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      {f.ownerName && (
                        <p className="text-xs text-muted-foreground">Owner: {f.ownerName}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={
                      "inline-flex items-center gap-1 text-xs font-medium " +
                      (f.overdue ? "text-destructive" : "text-muted-foreground")
                    }
                  >
                    {f.overdue && <AlertCircle className="size-3.5" />}
                    {f.nextFollowUpAt ? formatDate(f.nextFollowUpAt) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
