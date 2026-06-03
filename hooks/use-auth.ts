"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { LoginResponse, SignupResponse } from "@/lib/api/types";

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
