"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AcceptInviteResponse,
  InviteInfo,
  LoginResponse,
  ResetInfo,
  ResetPasswordResponse,
  SignupResponse,
} from "@/lib/api/types";

interface LoginInput {
  email: string;
  password: string;
}

interface SignupInput {
  agencyName: string;
  /** maps to backend `fullName` */
  name: string;
  email: string;
  password: string;
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  return fallback;
}

/**
 * POST /auth/login. Real authentication: the backend sets httpOnly session
 * cookies. On success we refetch /auth/me and navigate to the dashboard. On
 * failure we surface the error (toast) and DO NOT navigate.
 */
export function useLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      api<LoginResponse>("/auth/login", { method: "POST", body: input }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.me });
      toast.success("Welcome back");
      router.replace("/dashboard");
    },
    onError: (err) => {
      toast.error(messageFor(err, "Invalid email or password"));
    },
  });
}

/** POST /auth/signup. Creates the agency + owner and sets session cookies. */
export function useSignup() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupInput) =>
      api<SignupResponse>("/auth/signup", {
        method: "POST",
        body: {
          agencyName: input.agencyName,
          fullName: input.name,
          email: input.email,
          password: input.password,
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.me });
      toast.success("Agency created");
      router.replace("/dashboard");
    },
    onError: (err) => {
      toast.error(messageFor(err, "Could not create your agency"));
    },
  });
}

/** GET /auth/invite?token= — preview a pending invite (email + agency). */
export function useInviteInfo(token: string | null) {
  return useQuery({
    queryKey: ["invite", token],
    queryFn: () =>
      api<InviteInfo>("/auth/invite", { query: { token: token ?? undefined } }),
    enabled: !!token,
    retry: false,
  });
}

/**
 * POST /auth/accept-invite. Sets the member's password, marks the invite used,
 * and logs them straight in (backend sets session cookies). On success we
 * refetch /auth/me and land on the dashboard.
 */
export function useAcceptInvite() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { token: string; password: string; fullName?: string }) =>
      api<AcceptInviteResponse>("/auth/accept-invite", {
        method: "POST",
        body: input,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.me });
      toast.success("Welcome to the team");
      router.replace("/dashboard");
    },
    onError: (err) => {
      toast.error(messageFor(err, "Could not accept this invite"));
    },
  });
}

/**
 * POST /auth/forgot-password. The backend ALWAYS returns 200 { ok: true } and
 * never reveals whether the account exists, so this never errors meaningfully —
 * the page shows the same neutral success state regardless.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: { email: string }) =>
      api<{ ok: boolean }>("/auth/forgot-password", {
        method: "POST",
        body: input,
      }),
  });
}

/**
 * GET /auth/reset-password?token= — preview a reset token (returns the email).
 * 410/400 surface as an ApiError so the page can show the "invalid or expired"
 * state. Mirrors useInviteInfo.
 */
export function useResetInfo(token: string | null) {
  return useQuery({
    queryKey: queryKeys.resetToken(token),
    queryFn: () =>
      api<ResetInfo>("/auth/reset-password", {
        query: { token: token ?? undefined },
      }),
    enabled: !!token,
    retry: false,
  });
}

/**
 * POST /auth/reset-password. Sets a new password and logs the user straight in
 * (backend sets session cookies). On success we refetch /auth/me and land on
 * the dashboard — mirrors useAcceptInvite.
 */
export function useResetPassword() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      api<ResetPasswordResponse>("/auth/reset-password", {
        method: "POST",
        body: input,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.me });
      toast.success("Password updated");
      router.replace("/dashboard");
    },
    onError: (err) => {
      toast.error(
        messageFor(err, "This reset link is invalid, used, or expired"),
      );
    },
  });
}

/**
 * POST /auth/change-password (authenticated). 400 when the current password is
 * wrong — the caller handles field-level messaging, so we don't toast here.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api<{ ok: boolean }>("/auth/change-password", {
        method: "POST",
        body: input,
      }),
  });
}

/** POST /auth/logout, then clear cached session and redirect to /login. */
export function useLogout() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      qc.clear();
      router.replace("/login");
    },
  });
}
