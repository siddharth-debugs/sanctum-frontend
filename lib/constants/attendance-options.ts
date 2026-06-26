import type { AttendanceStatus } from "@/lib/api/types";

/** Per-status display metadata (Evergreen tints; never colour-only — pair with a label). */
export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus,
  { label: string; color: string }
> = {
  present: { label: "Present", color: "var(--success)" },
  late: { label: "Late", color: "var(--warning)" },
  half_day: { label: "Half day", color: "var(--accent)" },
  absent: { label: "Absent", color: "var(--destructive)" },
  on_leave: { label: "On leave", color: "var(--primary)" },
  holiday: { label: "Holiday", color: "#0ea5e9" },
  weekly_off: { label: "Weekly off", color: "var(--muted-foreground)" },
  none: { label: "—", color: "var(--muted-foreground)" },
};

/** Statuses shown in the calendar legend (skips the "none" placeholder). */
export const ATTENDANCE_LEGEND: AttendanceStatus[] = [
  "present",
  "late",
  "half_day",
  "absent",
  "on_leave",
  "holiday",
  "weekly_off",
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayLabel(n: number): string {
  return WEEKDAY_LABELS[n] ?? "";
}

/** Format minutes as "8h 30m" / "45m" / "0m". */
export function fmtMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0 || Number.isNaN(minutes)) return "0m";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Minutes-from-midnight (e.g. 540) -> "9:00 AM". */
export function fmtMinutesOfDay(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Current month key "YYYY-MM" in local time. */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a "YYYY-MM" key by ±n months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Human label for a "YYYY-MM" key, e.g. "June 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
