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
    mutationFn: () =>
      api<AttendanceRecord>("/attendance/check-out", { method: "POST" }),
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

/** Read the device geolocation (best-effort; resolves to undefined on deny). */
export function getGeolocation(): Promise<PunchInput> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  });
}
