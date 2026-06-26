"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceLegend } from "@/components/app/attendance-bits";
import {
  useAttendanceCalendar,
  useAttendanceSummary,
} from "@/hooks/use-attendance";
import {
  ATTENDANCE_STATUS_META,
  fmtMinutes,
  weekdayLabel,
  currentMonthKey,
  shiftMonth,
  monthLabel,
} from "@/lib/constants/attendance-options";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/api/types";

/** Read-only attendance calendar + summary for a single member (admin view). */
export function MemberAttendancePanel({ userId }: { userId: string }) {
  const [month, setMonth] = React.useState(() => currentMonthKey());
  const { data: cal, isLoading } = useAttendanceCalendar(month, userId);
  const { data: sum } = useAttendanceSummary(month, userId);
  const days = cal?.days ?? [];
  const leading = days.length ? days[0].weekday : 0;
  const s = sum?.summary;

  return (
    <div className="space-y-4">
      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ["Present", s.present],
            ["Late", s.late],
            ["Half", s.halfDay],
            ["Absent", s.absent],
            ["Leave", s.onLeave],
            ["Hours", fmtMinutes(s.workedMinutes)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-card p-3 text-center">
              <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">{monthLabel(month)}</h3>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(currentMonthKey())}>Today</Button>
            <Button variant="outline" size="icon-sm" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : (
          <>
            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((w) => (
                <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{weekdayLabel(w)}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: leading }).map((_, i) => (<div key={`pad-${i}`} />))}
              {days.map((d) => {
                const meta = ATTENDANCE_STATUS_META[d.status as AttendanceStatus];
                const showTint = d.status !== "none";
                return (
                  <div
                    key={d.day}
                    title={`${d.day} · ${meta.label}`}
                    className={cn("flex min-h-[56px] flex-col gap-1 rounded-lg border p-1.5", d.day === cal?.today && "ring-2 ring-primary")}
                    style={showTint ? { background: `color-mix(in srgb, ${meta.color} 12%, transparent)` } : undefined}
                  >
                    <span className="text-[11px] font-semibold tabular-nums">{Number(d.day.slice(8))}</span>
                    {showTint && (
                      <span className="mt-auto truncate text-[9px] font-medium" style={{ color: meta.color }}>{d.holidayName ?? meta.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <AttendanceLegend className="mt-4 border-t pt-4" />
          </>
        )}
      </GlassCard>
    </div>
  );
}
