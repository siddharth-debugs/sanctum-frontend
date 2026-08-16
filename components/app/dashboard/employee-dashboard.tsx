"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlarmClock,
  ArrowUpRight,
  CalendarClock,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ListChecks,
  ListTodo,
  Loader2,
  LogIn,
  LogOut,
  Plane,
  Timer,
  TriangleAlert,
} from "lucide-react";

import { KpiCard } from "@/components/app/kpi-card";
import { AttendanceStatusBadge } from "@/components/app/attendance-bits";
import { PriorityIcon, StatusBadge, DueChip } from "@/components/app/tasks";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/app/dashboard/shared";
import { useMyOverview, useMyTasks, type MyTask } from "@/hooks/use-my-day";
import {
  useActiveTimer,
  useElapsed,
  fmtClock,
  fmtDuration,
} from "@/hooks/use-timers";
import {
  useAttendanceToday,
  useCheckIn,
  useCheckOut,
  capturePunchLocation,
  geoErrorMessage,
  isCheckoutPending,
} from "@/hooks/use-attendance";
import { useLeaves, useLeaveBalances } from "@/hooks/use-leaves";
import { ApiError } from "@/lib/api/client";
import { cn, formatDate } from "@/lib/utils";
import type { AttendanceRecord } from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Is a task's due date before the start of today? (Done tasks are excluded.) */
function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return d.getTime() < start.getTime();
}

/** Whole worked MINUTES so far: stored once out, else live from check-in. */
function workedMinutesNow(record: AttendanceRecord | null, nowMs: number): number {
  if (!record?.checkInAt) return 0;
  if (record.checkOutAt) return record.workedMinutes;
  const started = new Date(record.checkInAt).getTime();
  if (Number.isNaN(started)) return record.workedMinutes;
  return Math.max(0, Math.floor((nowMs - started) / 60000));
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* "My day" — the employee dashboard                                   */
/* ------------------------------------------------------------------ */

export function EmployeeDashboard() {
  const { data: overview, isLoading: overviewLoading } = useMyOverview();
  const { data: tasks, isLoading: tasksLoading } = useMyTasks();

  return (
    <div className="space-y-6">
      <ActiveTimerBanner />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Open tasks"
          icon={ListTodo}
          value={overviewLoading ? "—" : overview?.openTasks ?? 0}
          hint="assigned to me"
        />
        <KpiCard
          label="Overdue"
          icon={TriangleAlert}
          value={
            overviewLoading ? (
              "—"
            ) : (overview?.overdueTasks ?? 0) > 0 ? (
              <span className="text-destructive">{overview?.overdueTasks}</span>
            ) : (
              0
            )
          }
          hint="past due date"
        />
        <KpiCard
          label="Due today"
          icon={CalendarClock}
          value={overviewLoading ? "—" : overview?.dueTodayTasks ?? 0}
          hint="wrap these up"
        />
        <KpiCard
          label="Time today"
          icon={Clock}
          value={overviewLoading ? "—" : fmtDuration(overview?.todayMinutes)}
          hint="logged today"
        />
        <KpiCard
          label="Time this week"
          icon={Timer}
          value={overviewLoading ? "—" : fmtDuration(overview?.weekMinutes)}
          hint="Mon → now"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* My tasks */}
        <SectionCard
          title="My tasks"
          description="Across every project — overdue first"
          icon={ListChecks}
          isLoading={tasksLoading}
          loadingRows={5}
          isEmpty={!tasksLoading && (tasks?.length ?? 0) === 0}
          emptyIcon={CheckCircle2}
          emptyText="You're all caught up — no open tasks assigned to you."
          action={
            tasks && tasks.length > 0 ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)] px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                {tasks.length}
              </span>
            ) : null
          }
          bodyClassName="px-3"
        >
          <ul className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">
            {tasks?.map((t) => <TaskRow key={t.id} task={t} />)}
          </ul>
        </SectionCard>

        {/* Right rail: attendance + leave */}
        <div className="space-y-4">
          <AttendanceCard />
          <LeaveCard />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Task row                                                            */
/* ------------------------------------------------------------------ */

function TaskRow({ task }: { task: MyTask }) {
  const overdue = isOverdue(task.dueDate);
  const meta = [task.projectName, task.clientName].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/projects/${task.projectId}`}
        className={cn(
          "group flex items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-[color-mix(in_srgb,var(--muted-foreground)_6%,transparent)]",
          overdue &&
            "border-l-2 border-l-destructive/60 bg-[color-mix(in_srgb,var(--destructive)_5%,transparent)]",
        )}
      >
        <PriorityIcon priority={task.priority} size={16} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{task.title}</p>
          {meta && (
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={task.status} />
          <DueChip date={task.dueDate} hideWhenEmpty />
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Active timer banner                                                 */
/* ------------------------------------------------------------------ */

function ActiveTimerBanner() {
  const { data: timer } = useActiveTimer();
  const elapsed = useElapsed(timer?.startedAt);
  if (!timer) return null;
  const label = timer.taskTitle || timer.projectName;
  return (
    <Link
      href={`/projects/${timer.projectId}`}
      className="flex items-center gap-3 rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))]"
    >
      <span className="relative flex size-2.5 shrink-0 items-center justify-center">
        <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
      </span>
      <Timer className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {fmtClock(elapsed)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        Timer running on <span className="text-foreground">{label}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Attendance card (reuses the punch hooks + geolocation capture)      */
/* ------------------------------------------------------------------ */

function AttendanceCard() {
  const { data: today, isLoading, refetch } = useAttendanceToday();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [capturing, setCapturing] = React.useState(false);

  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const record = today?.record ?? null;
  const isCheckedIn = !!record?.checkInAt && !record?.checkOutAt;
  const isDone = !!record?.checkInAt && !!record?.checkOutAt;
  const pending = checkIn.isPending || checkOut.isPending || capturing;
  const worked = fmtDuration(workedMinutesNow(record, nowMs));

  const handleCheckIn = React.useCallback(async () => {
    setCapturing(true);
    const punch = await capturePunchLocation();
    setCapturing(false);
    const captured = punch.lat != null && punch.lng != null;
    if (today?.enforceGeo && !captured) {
      toast.error(geoErrorMessage(punch.error));
      return;
    }
    checkIn.mutate(
      { lat: punch.lat, lng: punch.lng, location: punch.location },
      {
        onSuccess: (rec) => toast.success(`Checked in at ${fmtTime(rec.checkInAt)}`),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            void refetch();
            toast.message("You're already checked in.");
            return;
          }
          toast.error(err instanceof ApiError ? err.message : "Couldn't check in");
        },
      },
    );
  }, [checkIn, refetch, today?.enforceGeo]);

  const handleCheckOut = React.useCallback(async () => {
    setCapturing(true);
    const punch = await capturePunchLocation();
    setCapturing(false);
    checkOut.mutate(punch, {
      onSuccess: (res) => {
        // Outside the office fence → held for approval, not finalized.
        if (isCheckoutPending(res)) {
          toast.message(
            `Checkout sent for approval (you were ${res.distanceM} m outside the office).`,
          );
          return;
        }
        toast.success(`Checked out · ${fmtDuration(res.workedMinutes)} worked`);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.message("You're already checked out.");
          return;
        }
        toast.error(err instanceof ApiError ? err.message : "Couldn't check out");
      },
    });
  }, [checkOut]);

  return (
    <SectionCard
      title="Attendance today"
      description={formatDate(new Date(), { weekday: "long", month: "short", day: "numeric" })}
      icon={AlarmClock}
      isLoading={isLoading}
      loadingRows={2}
      action={<AttendanceStatusBadge status={record?.status ?? "none"} />}
    >
      <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
        <div className="space-y-0.5">
          <dt className="text-xs text-muted-foreground">Check in</dt>
          <dd className="font-medium tabular-nums">{fmtTime(record?.checkInAt)}</dd>
        </div>
        <div className="space-y-0.5">
          <dt className="text-xs text-muted-foreground">Check out</dt>
          <dd className="font-medium tabular-nums">{fmtTime(record?.checkOutAt)}</dd>
        </div>
        <div className="col-span-2 space-y-0.5">
          <dt className="text-xs text-muted-foreground">Worked</dt>
          <dd className="font-semibold tabular-nums" aria-live="polite">
            {record?.checkInAt ? worked : "Not started"}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        {isDone ? (
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            You&apos;re done for today · {worked}
          </div>
        ) : isCheckedIn ? (
          <Button
            className="w-full min-h-11"
            variant="destructive"
            onClick={handleCheckOut}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="size-4" aria-hidden />
            )}
            {capturing ? "Locating…" : checkOut.isPending ? "Checking out…" : "Check out"}
          </Button>
        ) : (
          <Button className="w-full min-h-11" onClick={handleCheckIn} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LogIn className="size-4" aria-hidden />
            )}
            {capturing ? "Locating…" : checkIn.isPending ? "Checking in…" : "Check in"}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Leave card — balances summary + my pending requests                 */
/* ------------------------------------------------------------------ */

function LeaveCard() {
  const year = new Date().getFullYear();
  const { data: balances, isLoading: balLoading } = useLeaveBalances("", year);
  const { data: leaves, isLoading: leavesLoading } = useLeaves("me");

  const pending = React.useMemo(
    () => (leaves ?? []).filter((l) => l.status === "pending"),
    [leaves],
  );
  const shownBalances = (balances?.balances ?? []).slice(0, 4);

  return (
    <SectionCard
      title="Leave"
      description="Balances & pending requests"
      icon={Plane}
      isLoading={balLoading}
      loadingRows={3}
      action={
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Manage <ArrowUpRight className="size-3" />
        </Link>
      }
    >
      {shownBalances.length > 0 ? (
        <ul className="space-y-2.5">
          {shownBalances.map((b) => (
            <li key={b.leaveTypeId} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ background: b.colorToken || "var(--primary)" }}
              />
              <span className="min-w-0 flex-1 truncate">{b.name}</span>
              <span className="tabular-nums font-medium">
                {b.remaining == null ? (
                  <span className="text-muted-foreground">Unlimited</span>
                ) : (
                  <>
                    {b.remaining}
                    <span className="text-muted-foreground">
                      {" "}
                      / {b.annualQuota} left
                    </span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No leave types configured.</p>
      )}

      <div className="mt-4 border-t pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <CalendarCheck className="size-3.5" /> Pending requests
        </div>
        {leavesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending leave requests.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{l.leaveTypeName ?? "Leave"}</span>{" "}
                  <span className="text-muted-foreground">
                    {formatDate(l.startDay)}
                    {l.endDay !== l.startDay ? ` – ${formatDate(l.endDay)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] px-2 py-0.5 text-xs font-semibold text-warning">
                  {l.days}d
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
