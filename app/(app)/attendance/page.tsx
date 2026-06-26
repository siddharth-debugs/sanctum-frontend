"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Clock,
  Timer,
  CheckCircle2,
  CalendarOff,
  TrendingUp,
  Plus,
  Check,
  X,
  Download,
  Plane,
  Wrench,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AttendanceStatusBadge,
  AttendanceLegend,
} from "@/components/app/attendance-bits";
import { ApplyLeaveSheet } from "@/components/app/apply-leave-sheet";
import { RegularizeDayDialog } from "@/components/app/regularize-day-dialog";
import {
  useAttendanceToday,
  useAttendanceCalendar,
  useAttendanceSummary,
  useAttendancePolicy,
  useCheckIn,
  useCheckOut,
  useWhosIn,
  useTeamSummary,
  getGeolocation,
} from "@/hooks/use-attendance";
import {
  useLeaves,
  useLeaveBalances,
  useCancelLeave,
  useDecideLeave,
} from "@/hooks/use-leaves";
import {
  useRegularizations,
  useCancelRegularization,
  useDecideRegularization,
} from "@/hooks/use-regularizations";
import {
  ATTENDANCE_STATUS_META,
  fmtMinutes,
  fmtMinutesOfDay,
  weekdayLabel,
  currentMonthKey,
  shiftMonth,
  monthLabel,
} from "@/lib/constants/attendance-options";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useSession } from "../session-context";
import type {
  AttendanceCalendarDay,
  AttendanceStatus,
  LeaveRequest,
  RegularizationRequest,
} from "@/lib/api/types";

function useNow(active: boolean) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
function fmtDay(day: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(
    undefined,
    opts ?? { day: "numeric", month: "short" },
  );
}

// ---------------------------------------------------------------------------
// Today / punch card  +  summary  +  calendar  (My Attendance tab)
// ---------------------------------------------------------------------------

function TodayPunchCard() {
  const { data, isLoading } = useAttendanceToday();
  const { data: policy } = useAttendancePolicy();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const rec = data?.record ?? null;
  const isIn = !!rec?.checkInAt && !rec?.checkOutAt;
  const isDone = !!rec?.checkInAt && !!rec?.checkOutAt;
  const now = useNow(isIn);

  const liveMinutes = React.useMemo(() => {
    if (!isIn || !rec?.checkInAt) return 0;
    return Math.max(0, Math.round((now - new Date(rec.checkInAt).getTime()) / 60000));
  }, [isIn, rec?.checkInAt, now]);

  const onCheckIn = async () => {
    const coords = data?.enforceGeo ? await getGeolocation() : {};
    checkIn.mutate(coords, {
      onSuccess: (r) => toast.success(r.isLate ? "Checked in (late)" : "Checked in"),
      onError: (e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't check in"),
    });
  };
  const onCheckOut = () =>
    checkOut.mutate(undefined, {
      onSuccess: (r) => toast.success(`Checked out — ${fmtMinutes(r.workedMinutes)} logged`),
      onError: (e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't check out"),
    });

  if (isLoading) return <Skeleton className="h-44 w-full rounded-xl" />;
  const pending = checkIn.isPending || checkOut.isPending;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <CalendarClock className="size-3.5" /> Today
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {data ? fmtDay(data.day, { weekday: "long", day: "numeric", month: "long" }) : "—"}
          </p>
          {policy && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Shift {fmtMinutesOfDay(policy.shiftStartMin)} –{" "}
              {fmtMinutesOfDay(policy.shiftEndMin)} · {policy.timezone}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Check in</p>
            <p className="font-semibold tabular-nums">{fmtTime(rec?.checkInAt ?? null)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {isIn ? "Working" : "Check out"}
            </p>
            <p className="flex items-center justify-end gap-1.5 font-semibold tabular-nums">
              {isIn ? (
                <>
                  <Timer className="size-3.5 text-primary" />
                  {fmtMinutes(liveMinutes)}
                </>
              ) : (
                fmtTime(rec?.checkOutAt ?? null)
              )}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex items-center gap-2">
          {rec ? (
            <AttendanceStatusBadge status={rec.status} />
          ) : (
            <span className="text-sm text-muted-foreground">Not checked in yet</span>
          )}
          {isDone && (
            <span className="text-sm text-muted-foreground">
              {fmtMinutes(rec!.workedMinutes)} worked
              {rec!.overtimeMinutes > 0 && ` · ${fmtMinutes(rec!.overtimeMinutes)} OT`}
            </span>
          )}
        </div>
        {isDone ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" /> Done for today
          </span>
        ) : isIn ? (
          <Button onClick={onCheckOut} disabled={pending} variant="outline">
            <LogOut className="size-4" /> Check out
          </Button>
        ) : (
          <Button onClick={onCheckIn} disabled={pending}>
            <LogIn className="size-4" /> Check in
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SummaryStats({ month }: { month: string }) {
  const { data, isLoading } = useAttendanceSummary(month);
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  const s = data?.summary;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile icon={<CheckCircle2 className="size-4" />} label="Present" value={s?.present ?? "—"} sub={s ? `${s.late} late · of ${s.workingDays} working days` : undefined} />
      <StatTile icon={<Clock className="size-4" />} label="Half days" value={s?.halfDay ?? "—"} />
      <StatTile icon={<CalendarOff className="size-4" />} label="Absent" value={s?.absent ?? "—"} sub={s ? `${s.onLeave} on leave` : undefined} />
      <StatTile icon={<TrendingUp className="size-4" />} label="Hours worked" value={s ? fmtMinutes(s.workedMinutes) : "—"} sub={s && s.overtimeMinutes > 0 ? `${fmtMinutes(s.overtimeMinutes)} overtime` : undefined} />
    </div>
  );
}

function CalendarCell({
  day,
  isToday,
  onClick,
}: {
  day: AttendanceCalendarDay;
  isToday: boolean;
  onClick?: () => void;
}) {
  const meta = ATTENDANCE_STATUS_META[day.status as AttendanceStatus];
  const dayNum = Number(day.day.slice(8));
  const showTint = day.status !== "none";
  const clickable = !!onClick && day.status !== "none";
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      title={`${day.day} · ${meta.label}${day.holidayName ? ` (${day.holidayName})` : ""}${day.workedMinutes ? ` · ${fmtMinutes(day.workedMinutes)}` : ""}`}
      className={cn(
        "flex min-h-[68px] flex-col gap-1 rounded-lg border p-2 text-left transition-colors",
        isToday && "ring-2 ring-primary",
        clickable && "hover:border-primary/50 cursor-pointer",
      )}
      style={showTint ? { background: `color-mix(in srgb, ${meta.color} 12%, transparent)` } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-semibold tabular-nums", isToday && "text-primary")}>{dayNum}</span>
        {day.isLate && (
          <span className="text-[10px] font-bold uppercase" style={{ color: "var(--warning)" }}>late</span>
        )}
      </div>
      {showTint && (
        <span className="mt-auto truncate text-[10px] font-medium leading-tight" style={{ color: meta.color }}>
          {day.holidayName ?? meta.label}
        </span>
      )}
      {day.workedMinutes > 0 && (
        <span className="text-[10px] text-muted-foreground tabular-nums">{fmtMinutes(day.workedMinutes)}</span>
      )}
    </button>
  );
}

function MonthCalendar({
  month,
  onMonth,
  userId,
  onDayClick,
}: {
  month: string;
  onMonth: (m: string) => void;
  userId?: string;
  onDayClick?: (day: AttendanceCalendarDay) => void;
}) {
  const { data, isLoading } = useAttendanceCalendar(month, userId);
  const days = data?.days ?? [];
  const leading = days.length ? days[0].weekday : 0;

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{monthLabel(month)}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMonth(currentMonthKey())}>Today</Button>
          <Button variant="outline" size="icon-sm" onClick={() => onMonth(shiftMonth(month, 1))} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <>
          <div className="mb-1.5 grid grid-cols-7 gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {weekdayLabel(w)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: leading }).map((_, i) => (<div key={`pad-${i}`} />))}
            {days.map((d) => (
              <CalendarCell key={d.day} day={d} isToday={d.day === data?.today} onClick={onDayClick ? () => onDayClick(d) : undefined} />
            ))}
          </div>
          <AttendanceLegend className="mt-4 border-t pt-4" />
          {onDayClick && (
            <p className="mt-2 text-xs text-muted-foreground">Tip: click a day to request a regularization.</p>
          )}
        </>
      )}
    </GlassCard>
  );
}

function MyAttendanceTab() {
  const [month, setMonth] = React.useState(() => currentMonthKey());
  const [regDay, setRegDay] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      <TodayPunchCard />
      <SummaryStats month={month} />
      <MonthCalendar
        month={month}
        onMonth={setMonth}
        onDayClick={(d) => {
          if (d.status === "none" || d.status === "weekly_off" || d.status === "holiday") return;
          setRegDay(d.day);
        }}
      />
      <RegularizeDayDialog
        open={!!regDay}
        onOpenChange={(o) => !o && setRegDay(null)}
        day={regDay ?? ""}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leaves tab
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: LeaveRequest["status"] }) {
  const map: Record<string, string> = {
    pending: "text-warning bg-[color-mix(in_srgb,var(--warning)_15%,transparent)]",
    approved: "text-success bg-[color-mix(in_srgb,var(--success)_15%,transparent)]",
    rejected: "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
    cancelled: "text-muted-foreground bg-muted",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", map[status])}>
      {status}
    </span>
  );
}

function LeavesTab() {
  const session = useSession();
  const year = new Date().getFullYear();
  const { data: balances } = useLeaveBalances("", year);
  const { data: leaves } = useLeaves("me");
  const { data: regs } = useRegularizations("me");
  const cancelLeave = useCancelLeave();
  const cancelReg = useCancelRegularization();
  const [applyOpen, setApplyOpen] = React.useState(false);
  void session;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Leave balances · {year}</h2>
        <Button onClick={() => setApplyOpen(true)}>
          <Plus className="size-4" /> Apply for leave
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(balances?.balances ?? []).map((b) => (
          <div key={b.leaveTypeId} className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">{b.name}</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {b.remaining ?? "∞"}
              {b.annualQuota > 0 && (
                <span className="text-base text-muted-foreground"> / {b.annualQuota}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{b.used} used · {b.paid ? "paid" : "unpaid"}</p>
          </div>
        ))}
        {balances && balances.balances.length === 0 && (
          <p className="text-sm text-muted-foreground sm:col-span-4">
            No leave types configured yet.
          </p>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>My leave requests</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {!leaves || leaves.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <ul className="divide-y">
              {leaves.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {l.leaveTypeName} · {fmtDay(l.startDay)} → {fmtDay(l.endDay)}
                      <span className="ml-2 text-muted-foreground">{l.days} day(s)</span>
                    </p>
                    {l.reason && <p className="text-xs text-muted-foreground">{l.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={l.status} />
                    {l.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => cancelLeave.mutate(l.id)}>Cancel</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>My regularization requests</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {!regs || regs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <ul className="divide-y">
              {regs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {fmtDay(r.day)} · {r.type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={r.status} />
                    {r.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => cancelReg.mutate(r.id)}>Cancel</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ApplyLeaveSheet open={applyOpen} onOpenChange={setApplyOpen} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approvals tab (admin)
// ---------------------------------------------------------------------------

function ApprovalsTab() {
  const { data: leaves } = useLeaves("pending");
  const { data: regs } = useRegularizations("pending");
  const decideLeave = useDecideLeave();
  const decideReg = useDecideRegularization();

  const onLeave = (l: LeaveRequest, decision: "approved" | "rejected") =>
    decideLeave.mutate(
      { id: l.id, decision },
      { onSuccess: () => toast.success(`Leave ${decision}`), onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed") },
    );
  const onReg = (r: RegularizationRequest, decision: "approved" | "rejected") =>
    decideReg.mutate(
      { id: r.id, decision },
      { onSuccess: () => toast.success(`Request ${decision}`), onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed") },
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Pending leave requests</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {!leaves || leaves.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing to review.</p>
          ) : (
            <ul className="divide-y">
              {leaves.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {l.userName} · {l.leaveTypeName} · {fmtDay(l.startDay)} → {fmtDay(l.endDay)}
                      <span className="ml-2 text-muted-foreground">{l.days} day(s)</span>
                    </p>
                    {l.reason && <p className="text-xs text-muted-foreground">{l.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-success" onClick={() => onLeave(l, "approved")}>
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onLeave(l, "rejected")}>
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pending regularizations</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {!regs || regs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing to review.</p>
          ) : (
            <ul className="divide-y">
              {regs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {r.userName} · {fmtDay(r.day)} · {r.type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-success" onClick={() => onReg(r, "approved")}>
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onReg(r, "rejected")}>
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team tab (admin): who's in + monthly report + CSV
// ---------------------------------------------------------------------------

function TeamTab() {
  const [month, setMonth] = React.useState(() => currentMonthKey());
  const { data: whosIn } = useWhosIn();
  const { data: team } = useTeamSummary(month);

  const exportCsv = () => {
    if (!team) return;
    const headers = ["Member", "Present", "Late", "Half-days", "Absent", "On leave", "Holidays", "Weekly-offs", "Hours worked", "Overtime (min)"];
    const rows = team.members.map((m) => [
      m.name, m.summary.present, m.summary.late, m.summary.halfDay, m.summary.absent,
      m.summary.onLeave, m.summary.holiday, m.summary.weeklyOff,
      (m.summary.workedMinutes / 60).toFixed(2), m.summary.overtimeMinutes,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Who&apos;s in today</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {!whosIn ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {whosIn.members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    {m.checkInAt && (
                      <p className="text-xs text-muted-foreground">
                        in {fmtTime(m.checkInAt)}
                        {m.checkOutAt ? ` · out ${fmtTime(m.checkOutAt)}` : " · working"}
                      </p>
                    )}
                  </div>
                  <AttendanceStatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Monthly report · {monthLabel(month)}</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon-sm" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="size-4" /></Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!team}>
              <Download className="size-4" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!team ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 text-left">Member</th>
                    <th className="py-2 text-center">Present</th>
                    <th className="py-2 text-center">Late</th>
                    <th className="py-2 text-center">Half</th>
                    <th className="py-2 text-center">Absent</th>
                    <th className="py-2 text-center">Leave</th>
                    <th className="py-2 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((m) => (
                    <tr key={m.userId} className="border-b last:border-0">
                      <td className="py-2 font-medium">{m.name}</td>
                      <td className="py-2 text-center tabular-nums">{m.summary.present}</td>
                      <td className="py-2 text-center tabular-nums">{m.summary.late}</td>
                      <td className="py-2 text-center tabular-nums">{m.summary.halfDay}</td>
                      <td className="py-2 text-center tabular-nums">{m.summary.absent}</td>
                      <td className="py-2 text-center tabular-nums">{m.summary.onLeave}</td>
                      <td className="py-2 text-right tabular-nums">{fmtMinutes(m.summary.workedMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function AttendancePage() {
  const session = useSession();
  const isPrivileged = session.user.role === "owner" || session.user.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={<><CalendarClock className="size-3" /> Attendance</>}
        title="Attendance"
        description="Mark your day in and out, manage leaves, and track attendance."
      />

      <Tabs defaultValue="me">
        <TabsList>
          <TabsTrigger value="me">My Attendance</TabsTrigger>
          <TabsTrigger value="leaves">
            <Plane className="size-3.5" /> Leaves
          </TabsTrigger>
          {isPrivileged && (
            <TabsTrigger value="approvals">
              <Wrench className="size-3.5" /> Approvals
            </TabsTrigger>
          )}
          {isPrivileged && <TabsTrigger value="team">Team</TabsTrigger>}
        </TabsList>

        <TabsContent value="me" className="mt-5"><MyAttendanceTab /></TabsContent>
        <TabsContent value="leaves" className="mt-5"><LeavesTab /></TabsContent>
        {isPrivileged && (
          <TabsContent value="approvals" className="mt-5"><ApprovalsTab /></TabsContent>
        )}
        {isPrivileged && (
          <TabsContent value="team" className="mt-5"><TeamTab /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}
