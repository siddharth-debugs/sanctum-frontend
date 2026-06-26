"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, CalendarDays, Plane } from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAttendancePolicy,
  useUpdateAttendancePolicy,
  useHolidays,
  useAddHoliday,
  useDeleteHoliday,
  getGeolocation,
} from "@/hooks/use-attendance";
import {
  useLeaveTypes,
  useCreateLeaveType,
  useDeleteLeaveType,
} from "@/hooks/use-leaves";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { AttendancePolicy } from "@/lib/api/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-start gap-2">
        {icon}
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Work policy
// ---------------------------------------------------------------------------

function WorkPolicyForm() {
  const { data: policy, isLoading } = useAttendancePolicy();
  const update = useUpdateAttendancePolicy();
  const [draft, setDraft] = React.useState<AttendancePolicy | null>(null);

  React.useEffect(() => {
    if (policy) setDraft(policy);
  }, [policy]);

  if (isLoading || !draft) return <Skeleton className="h-96 rounded-xl" />;

  const set = <K extends keyof AttendancePolicy>(k: K, v: AttendancePolicy[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const toggleWorkday = (n: number) =>
    set(
      "workdays",
      draft.workdays.includes(n)
        ? draft.workdays.filter((x) => x !== n)
        : [...draft.workdays, n].sort(),
    );

  const onSave = () => {
    update.mutate(
      {
        timezone: draft.timezone,
        workdays: draft.workdays,
        saturdayOffWeeks: draft.saturdayOffWeeks,
        shiftStartMin: draft.shiftStartMin,
        shiftEndMin: draft.shiftEndMin,
        fullDayMinutes: draft.fullDayMinutes,
        halfDayMinutes: draft.halfDayMinutes,
        lateGraceMinutes: draft.lateGraceMinutes,
        countOvertime: draft.countOvertime,
        enforceIp: draft.enforceIp,
        allowedIps: draft.allowedIps,
        enforceGeo: draft.enforceGeo,
        geoLat: draft.geoLat,
        geoLng: draft.geoLng,
        geoRadiusM: draft.geoRadiusM,
      },
      {
        onSuccess: () => toast.success("Attendance policy saved"),
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : "Couldn't save"),
      },
    );
  };

  const useMyLocation = async () => {
    const { lat, lng } = await getGeolocation();
    if (lat == null) {
      toast.error("Couldn't read your location.");
      return;
    }
    setDraft((d) => (d ? { ...d, geoLat: lat, geoLng: lng ?? null } : d));
    toast.success("Location captured");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Input
            value={draft.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            placeholder="Asia/Kolkata"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Working days</Label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((w, i) => {
              const on = draft.workdays.includes(i);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggleWorkday(i)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    on
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Saturday rule — only relevant when Saturday is a working day. */}
      {draft.workdays.includes(6) && (
        <div className="space-y-2 rounded-xl border bg-[color-mix(in_srgb,var(--muted-foreground)_4%,transparent)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Saturdays off (which weeks of the month)</Label>
            <div className="flex gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => set("saturdayOffWeeks", [2, 4])}
                className="rounded-md border px-2 py-1 font-medium hover:bg-muted"
              >
                2nd &amp; 4th
              </button>
              <button
                type="button"
                onClick={() => set("saturdayOffWeeks", [1, 3])}
                className="rounded-md border px-2 py-1 font-medium hover:bg-muted"
              >
                1st &amp; 3rd
              </button>
              <button
                type="button"
                onClick={() => set("saturdayOffWeeks", [])}
                className="rounded-md border px-2 py-1 font-medium hover:bg-muted"
              >
                All working
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["1st", "2nd", "3rd", "4th", "5th"].map((label, idx) => {
              const ord = idx + 1;
              const off = draft.saturdayOffWeeks.includes(ord);
              return (
                <button
                  key={ord}
                  type="button"
                  onClick={() =>
                    set(
                      "saturdayOffWeeks",
                      off
                        ? draft.saturdayOffWeeks.filter((x) => x !== ord)
                        : [...draft.saturdayOffWeeks, ord].sort(),
                    )
                  }
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
                    off
                      ? "border-transparent bg-[color-mix(in_srgb,var(--muted-foreground)_22%,transparent)] text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {label} Sat
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Selected Saturdays are days off; the rest are working. Your current
            rule:{" "}
            {draft.saturdayOffWeeks.length
              ? `${draft.saturdayOffWeeks
                  .map((n) => ["", "1st", "2nd", "3rd", "4th", "5th"][n])
                  .join(" & ")} Saturday off`
              : "all Saturdays working"}
            .
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Shift start</Label>
          <Input
            type="time"
            value={minToTime(draft.shiftStartMin)}
            onChange={(e) => set("shiftStartMin", timeToMin(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Shift end</Label>
          <Input
            type="time"
            value={minToTime(draft.shiftEndMin)}
            onChange={(e) => set("shiftEndMin", timeToMin(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Full day (hours)</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={draft.fullDayMinutes / 60}
            onChange={(e) =>
              set("fullDayMinutes", Math.round(Number(e.target.value) * 60))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Half day (hours)</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={draft.halfDayMinutes / 60}
            onChange={(e) =>
              set("halfDayMinutes", Math.round(Number(e.target.value) * 60))
            }
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Late grace (minutes)</Label>
          <Input
            type="number"
            min={0}
            value={draft.lateGraceMinutes}
            onChange={(e) => set("lateGraceMinutes", Number(e.target.value))}
          />
        </div>
        <label className="flex items-center gap-3 rounded-lg border px-3 sm:mt-6">
          <Switch
            checked={draft.countOvertime}
            onCheckedChange={(v) => set("countOvertime", v)}
          />
          <span className="text-sm">Count overtime beyond a full day</span>
        </label>
      </div>

      {/* Fencing */}
      <div className="space-y-4 rounded-xl border p-4">
        <label className="flex items-center gap-3">
          <Switch
            checked={draft.enforceIp}
            onCheckedChange={(v) => set("enforceIp", v)}
          />
          <span className="text-sm font-medium">
            Restrict check-in to approved IPs / networks
          </span>
        </label>
        {draft.enforceIp && (
          <div className="space-y-1.5">
            <Label>Allowed IPs / CIDRs (comma-separated)</Label>
            <Input
              value={draft.allowedIps.join(", ")}
              onChange={(e) =>
                set(
                  "allowedIps",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="203.0.113.5, 192.168.1.0/24"
            />
          </div>
        )}

        <label className="flex items-center gap-3">
          <Switch
            checked={draft.enforceGeo}
            onCheckedChange={(v) => set("enforceGeo", v)}
          />
          <span className="text-sm font-medium">
            Restrict check-in to an office location
          </span>
        </label>
        {draft.enforceGeo && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Latitude</Label>
              <Input
                type="number"
                value={draft.geoLat ?? ""}
                onChange={(e) =>
                  set("geoLat", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Longitude</Label>
              <Input
                type="number"
                value={draft.geoLng ?? ""}
                onChange={(e) =>
                  set("geoLng", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Radius (m)</Label>
              <Input
                type="number"
                value={draft.geoRadiusM ?? ""}
                onChange={(e) =>
                  set(
                    "geoRadiusM",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={useMyLocation}
              className="sm:col-span-3 sm:w-fit"
            >
              <MapPin className="size-4" /> Use my current location
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save policy"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------

function HolidaysManager() {
  const year = new Date().getFullYear();
  const { data: holidays, isLoading } = useHolidays(year);
  const add = useAddHoliday(year);
  const del = useDeleteHoliday(year);
  const [day, setDay] = React.useState("");
  const [name, setName] = React.useState("");

  const onAdd = () => {
    if (!day || !name.trim()) {
      toast.error("Pick a date and name.");
      return;
    }
    add.mutate(
      { day, name: name.trim() },
      {
        onSuccess: () => {
          toast.success("Holiday added");
          setDay("");
          setName("");
        },
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : "Couldn't add"),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="sm:w-44"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Holiday name (e.g. Diwali)"
          className="flex-1"
        />
        <Button onClick={onAdd} disabled={add.isPending}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : !holidays || holidays.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No holidays set for {year}.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">
                  {new Date(`${h.day}T00:00:00`).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="text-sm">{h.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => del.mutate(h.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leave types
// ---------------------------------------------------------------------------

function LeaveTypesManager() {
  const { data: types, isLoading } = useLeaveTypes();
  const create = useCreateLeaveType();
  const del = useDeleteLeaveType();
  const [name, setName] = React.useState("");
  const [quota, setQuota] = React.useState("");
  const [paid, setPaid] = React.useState(true);

  const onAdd = () => {
    if (!name.trim()) {
      toast.error("Enter a name.");
      return;
    }
    create.mutate(
      { name: name.trim(), annualQuota: Number(quota) || 0, paid },
      {
        onSuccess: () => {
          toast.success("Leave type added");
          setName("");
          setQuota("");
          setPaid(true);
        },
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : "Couldn't add"),
      },
    );
  };

  const active = (types ?? []).filter((t) => t.active);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type name (e.g. Casual, Sick)"
          className="flex-1"
        />
        <Input
          type="number"
          min={0}
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          placeholder="Quota/yr (0=∞)"
          className="sm:w-36"
        />
        <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <Switch checked={paid} onCheckedChange={setPaid} /> Paid
        </label>
        <Button onClick={onAdd} disabled={create.isPending}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : active.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No leave types yet. Add casual, sick, earned, etc.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {active.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold">{t.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t.annualQuota > 0 ? `${t.annualQuota} days/yr` : "Unlimited"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    t.paid
                      ? "text-success bg-[color-mix(in_srgb,var(--success)_14%,transparent)]"
                      : "text-muted-foreground bg-muted",
                  )}
                >
                  {t.paid ? "Paid" : "Unpaid"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => del.mutate(t.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AttendanceSettings() {
  return (
    <div className="space-y-6">
      <Section
        title="Work policy"
        description="Defines working days, shift, late grace, and how hours map to full/half days."
      >
        <WorkPolicyForm />
      </Section>
      <Section
        title="Holidays"
        description="Agency-wide holidays applied to everyone's calendar."
        icon={<CalendarDays className="mt-1 size-5 text-primary" />}
      >
        <HolidaysManager />
      </Section>
      <Section
        title="Leave types"
        description="The leave categories members can apply for, with annual quotas."
        icon={<Plane className="mt-1 size-5 text-primary" />}
      >
        <LeaveTypesManager />
      </Section>
    </div>
  );
}
