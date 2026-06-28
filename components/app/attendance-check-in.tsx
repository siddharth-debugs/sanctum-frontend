"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Clock,
  LogIn,
  LogOut,
  MapPin,
  MapPinOff,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AttendanceStatusBadge } from "@/components/app/attendance-bits";
import {
  useAttendanceToday,
  useCheckIn,
  useCheckOut,
  capturePunchLocation,
  geoErrorMessage,
} from "@/hooks/use-attendance";
import { fmtDuration } from "@/hooks/use-timers";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Whole worked MINUTES so far: stored value once out, else live from check-in. */
function workedMinutesNow(
  record: AttendanceRecord | null | undefined,
  nowMs: number,
): number {
  if (!record?.checkInAt) return 0;
  if (record.checkOutAt) return record.workedMinutes;
  const started = new Date(record.checkInAt).getTime();
  if (Number.isNaN(started)) return record.workedMinutes;
  return Math.max(0, Math.floor((nowMs - started) / 60000));
}

/** Friendly clock time, e.g. "9:15 AM". */
function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Header attendance control. A compact pill (left of the notification bell)
 * that reflects today's punch state and lets any member check in / out in one
 * tap from anywhere — geolocation is captured best-effort and never blocks the
 * punch. Clicking opens a popover with the full day's detail.
 */
export function AttendanceCheckIn() {
  const { data: today, refetch: refetchToday } = useAttendanceToday();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [open, setOpen] = React.useState(false);

  // Live 30s ticker for the worked-time display (cleaned up on unmount).
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Remember whether the last punch captured coordinates, for the hint.
  const [locState, setLocState] = React.useState<"on" | "off" | null>(null);
  // True while we're reading geolocation + reverse-geocoding (before the punch).
  const [capturing, setCapturing] = React.useState(false);

  const record = today?.record ?? null;
  const isCheckedIn = !!record?.checkInAt && !record?.checkOutAt;
  const isDone = !!record?.checkInAt && !!record?.checkOutAt;
  const pending = checkIn.isPending || checkOut.isPending || capturing;

  const minutes = workedMinutesNow(record, nowMs);
  const worked = fmtDuration(minutes);

  const handleCheckIn = React.useCallback(async () => {
    setCapturing(true);
    const punch = await capturePunchLocation();
    setCapturing(false);
    const captured = punch.lat != null && punch.lng != null;
    setLocState(captured ? "on" : "off");

    // When the agency requires location, the punch is BLOCKED until we have
    // coordinates — with a clear, reason-specific message.
    if (today?.enforceGeo && !captured) {
      toast.error(geoErrorMessage(punch.error));
      return;
    }

    const wasDone = !!record?.checkOutAt; // re-check-in (corrects a checkout)
    checkIn.mutate(
      { lat: punch.lat, lng: punch.lng, location: punch.location },
      {
        onSuccess: (rec) => {
          const verb = wasDone ? "Back in" : "Checked in";
          toast.success(
            rec.checkInLocation
              ? `${verb} at ${fmtTime(rec.checkInAt)} · ${rec.checkInLocation}`
              : `${verb} at ${fmtTime(rec.checkInAt)}`,
          );
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            void refetchToday();
            toast.message("You're already checked in.");
            return;
          }
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't check in",
          );
        },
      },
    );
  }, [checkIn, refetchToday, today?.enforceGeo, record?.checkOutAt]);

  const handleCheckOut = React.useCallback(async () => {
    setCapturing(true);
    const punch = await capturePunchLocation();
    setCapturing(false);
    setLocState(punch.lat != null ? "on" : "off");

    checkOut.mutate(punch, {
      onSuccess: (rec) => {
        toast.success(
          `Checked out at ${fmtTime(rec.checkOutAt)} · ${fmtDuration(
            rec.workedMinutes,
          )} worked`,
        );
        setOpen(false);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.message("You're already checked out.");
          return;
        }
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't check out",
        );
      },
    });
  }, [checkOut]);

  /* ---- Trigger pill (compact; icon-only under sm) ---- */

  let triggerLabel: string;
  let triggerIcon: React.ReactNode;
  if (isCheckedIn) {
    triggerLabel = `Checked in · ${worked}`;
    triggerIcon = (
      <span
        className="relative flex size-2 shrink-0 items-center justify-center"
        aria-hidden
      >
        <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[var(--success,#22c55e)] opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-[var(--success,#22c55e)]" />
      </span>
    );
  } else if (isDone) {
    triggerLabel = `Done · ${worked}`;
    triggerIcon = <CheckCircle2 className="size-4 shrink-0" aria-hidden />;
  } else {
    triggerLabel = "Check in";
    triggerIcon = <Clock className="size-4 shrink-0" aria-hidden />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-print-hide
          aria-label={
            isCheckedIn
              ? `Checked in, ${worked} worked. Open attendance`
              : isDone
                ? `Checked out, ${worked} worked. Open attendance`
                : "Check in"
          }
          className={cn(
            "flex h-9 min-h-11 items-center gap-2 rounded-full border px-2.5 text-sm font-medium",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:min-h-9",
            isCheckedIn &&
              "border-[color-mix(in_srgb,var(--success,#22c55e)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success,#22c55e)_10%,var(--card))] text-foreground",
            isDone &&
              "border-border bg-[color-mix(in_srgb,var(--card)_50%,transparent)] text-muted-foreground",
            !isCheckedIn &&
              !isDone &&
              "border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] text-foreground hover:bg-[color-mix(in_srgb,var(--primary)_16%,var(--card))]",
          )}
        >
          {triggerIcon}
          <span className="hidden tabular-nums sm:inline">{triggerLabel}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Today</span>
            <AttendanceStatusBadge status={record?.status ?? "none"} />
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">Check in</dt>
              <dd className="font-medium tabular-nums">
                {fmtTime(record?.checkInAt)}
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">Check out</dt>
              <dd className="font-medium tabular-nums">
                {fmtTime(record?.checkOutAt)}
              </dd>
            </div>
            <div className="col-span-2 space-y-0.5">
              <dt className="text-xs text-muted-foreground">Worked</dt>
              <dd className="font-semibold tabular-nums" aria-live="polite">
                {record?.checkInAt ? worked : "Not started"}
              </dd>
            </div>
          </dl>

          {/* Where the punch was marked (reverse-geocoded area). */}
          {(capturing ||
            record?.checkInLocation ||
            record?.checkOutLocation ||
            locState === "off") && (
            <div className="space-y-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
              {capturing ? (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Getting your location…
                </p>
              ) : record?.checkInLocation ? (
                <p className="flex items-start gap-1.5">
                  <MapPin
                    className="mt-0.5 size-3.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>
                    <span className="text-muted-foreground">
                      Checked in from{" "}
                    </span>
                    <span className="font-medium">
                      {record.checkInLocation}
                    </span>
                  </span>
                </p>
              ) : locState === "off" ? (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPinOff className="size-3.5" aria-hidden /> Location off —
                  area not recorded
                </p>
              ) : null}

              {!capturing && record?.checkOutLocation && (
                <p className="flex items-start gap-1.5">
                  <MapPin
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>
                    <span className="text-muted-foreground">
                      Checked out from{" "}
                    </span>
                    <span className="font-medium">
                      {record.checkOutLocation}
                    </span>
                  </span>
                </p>
              )}
            </div>
          )}

          {isDone ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                You&apos;re done for today.
              </div>
              <Button
                variant="outline"
                className="w-full min-h-11"
                onClick={handleCheckIn}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <LogIn className="size-4" aria-hidden />
                )}
                {capturing
                  ? "Locating…"
                  : checkIn.isPending
                    ? "Checking in…"
                    : "Check in again"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Checked out by mistake? Resume your day.
              </p>
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
              {capturing
                ? "Locating…"
                : checkOut.isPending
                  ? "Checking out…"
                  : "Check out"}
            </Button>
          ) : (
            <Button
              className="w-full min-h-11"
              onClick={handleCheckIn}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LogIn className="size-4" aria-hidden />
              )}
              {capturing
                ? "Locating…"
                : checkIn.isPending
                  ? "Checking in…"
                  : "Check in"}
            </Button>
          )}

          <Link
            href="/attendance"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
          >
            Open attendance
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
