"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AttendanceCalendar,
  AttendancePolicy,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceToday,
  Holiday,
  TeamSummary,
  WhosIn,
} from "@/lib/api/types";

/** GET /attendance/policy — the effective work policy. */
export function useAttendancePolicy() {
  return useQuery<AttendancePolicy>({
    queryKey: queryKeys.attendancePolicy,
    queryFn: () => api<AttendancePolicy>("/attendance/policy"),
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /attendance/today — my record for the current day. */
export function useAttendanceToday() {
  return useQuery<AttendanceToday>({
    queryKey: queryKeys.attendanceToday,
    queryFn: () => api<AttendanceToday>("/attendance/today"),
  });
}

/** GET /attendance/calendar?month=YYYY-MM[&userId]. */
export function useAttendanceCalendar(month: string, userId?: string) {
  return useQuery<AttendanceCalendar>({
    queryKey: queryKeys.attendanceCalendar(month, userId),
    queryFn: () =>
      api<AttendanceCalendar>("/attendance/calendar", {
        query: { month, userId },
      }),
    enabled: !!month,
  });
}

/** GET /attendance/summary?month=YYYY-MM[&userId]. */
export function useAttendanceSummary(month: string, userId?: string) {
  return useQuery<AttendanceSummary>({
    queryKey: queryKeys.attendanceSummary(month, userId),
    queryFn: () =>
      api<AttendanceSummary>("/attendance/summary", {
        query: { month, userId },
      }),
    enabled: !!month,
  });
}

export interface PunchInput {
  lat?: number;
  lng?: number;
  /** Human-readable area, reverse-geocoded from the coords (best-effort). */
  location?: string;
}

function useInvalidateAttendance() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["attendance"] });
}

/** POST /attendance/check-in. */
export function useCheckIn() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: (input: PunchInput = {}) =>
      api<AttendanceRecord>("/attendance/check-in", {
        method: "POST",
        body: input,
      }),
    onSuccess: invalidate,
  });
}

/** POST /attendance/check-out. */
export function useCheckOut() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: (input: PunchInput = {}) =>
      api<AttendanceRecord>("/attendance/check-out", {
        method: "POST",
        body: input,
      }),
    onSuccess: invalidate,
  });
}

// ---- Admin: policy ----

export function useUpdateAttendancePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AttendancePolicy> & { workdays?: number[]; allowedIps?: string[] }) =>
      api<AttendancePolicy>("/attendance/policy", { method: "PUT", body: input }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.attendancePolicy, data);
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// ---- Admin: holidays ----

export function useHolidays(year: number) {
  return useQuery<Holiday[]>({
    queryKey: queryKeys.holidays(year),
    queryFn: () => api<Holiday[]>("/attendance/holidays", { query: { year } }),
  });
}

export function useAddHoliday(year: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { day: string; name: string; recurring?: boolean }) =>
      api<Holiday>("/attendance/holidays", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays(year) });
      qc.invalidateQueries({ queryKey: ["attendance", "calendar"] });
    },
  });
}

export function useDeleteHoliday(year: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/attendance/holidays/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holidays(year) });
      qc.invalidateQueries({ queryKey: ["attendance", "calendar"] });
    },
  });
}

// ---- Admin: who's in + team report + mark ----

export function useWhosIn(enabled = true) {
  return useQuery<WhosIn>({
    queryKey: queryKeys.whosIn,
    queryFn: () => api<WhosIn>("/attendance/whos-in"),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useTeamSummary(month: string, enabled = true) {
  return useQuery<TeamSummary>({
    queryKey: queryKeys.teamSummary(month),
    queryFn: () => api<TeamSummary>("/attendance/team-summary", { query: { month } }),
    enabled: enabled && !!month,
  });
}

export interface MarkInput {
  userId: string;
  day: string;
  status?: string;
  checkInAt?: string;
  checkOutAt?: string;
  note?: string;
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkInput) =>
      api<AttendanceRecord>("/attendance/mark", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** Why geolocation couldn't be captured (drives the user-facing message). */
export type GeoErrorReason =
  | "insecure"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export interface GeoResult extends PunchInput {
  error?: GeoErrorReason;
}

/** A clear, actionable message for a geolocation failure. */
export function geoErrorMessage(reason?: GeoErrorReason): string {
  switch (reason) {
    case "insecure":
      return "Location needs a secure connection. Open Sanctum at http://localhost:3000 or your https:// address to check in.";
    case "denied":
      return "Location access is required. Please allow location in your browser, then try again.";
    case "unsupported":
      return "This device can't share its location, which is required to check in.";
    default:
      return "Couldn't get your location. Please enable location and try again.";
  }
}

/** Read the device geolocation. Resolves with coords, or an `error` reason. */
export function getGeolocation(): Promise<GeoResult> {
  return new Promise((resolve) => {
    // Browsers block geolocation on insecure origins (non-HTTPS, non-localhost).
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      resolve({ error: "insecure" });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ error: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const reason: GeoErrorReason =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable";
        resolve({ error: reason });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  });
}

/**
 * Reverse-geocode coordinates to a concise human-readable area (e.g.
 * "Andheri East, Mumbai, Maharashtra") via OpenStreetMap Nominatim — free, no
 * API key. Best-effort: returns undefined on timeout/error so it never blocks
 * a punch. Capped at ~4.5s.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | undefined> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { signal: ctrl.signal, headers: { Accept: "application/json" } },
    );
    clearTimeout(t);
    if (!res.ok) return undefined;
    const j = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = j.address ?? {};
    const parts = [
      a.neighbourhood || a.suburb || a.quarter || a.road || a.hamlet,
      a.city || a.town || a.village || a.municipality || a.county,
      a.state,
    ].filter(Boolean) as string[];
    const label = parts.length
      ? Array.from(new Set(parts)).join(", ")
      : j.display_name;
    return label ? label.slice(0, 180) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Capture the device location for a punch: coordinates (≤6s, never blocks) plus
 * a best-effort reverse-geocoded area label. Resolves {} if location is denied.
 */
export async function capturePunchLocation(): Promise<GeoResult> {
  const geo = await Promise.race<GeoResult>([
    getGeolocation(),
    new Promise<GeoResult>((resolve) =>
      setTimeout(() => resolve({ error: "timeout" }), 6000),
    ),
  ]);
  if (geo.lat == null || geo.lng == null) return geo; // carries `.error`
  const location = await reverseGeocode(geo.lat, geo.lng);
  return { lat: geo.lat, lng: geo.lng, location };
}
