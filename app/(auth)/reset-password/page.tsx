"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Loader2 } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/fields";
import { GlassCard } from "@/components/app/glass-card";
import { useResetInfo, useResetPassword } from "@/hooks/use-auth";

const resetSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string().min(8, "At least 8 characters"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
type ResetValues = z.infer<typeof resetSchema>;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <GlassCard strong className="w-full max-w-md p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sanctum-logo.png?v=2"
          alt="Sanctum"
          width={48}
          height={48}
          className="size-12 object-contain"
        />
        {children}
      </div>
    </GlassCard>
  );
}

function Spinner({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <Loader2 className="mt-2 size-5 animate-spin text-primary" aria-hidden />
    </Shell>
  );
}

/** Invalid / expired link — points the user back to /forgot-password. */
function InvalidCard({ body }: { body: string }) {
  return (
    <Shell>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Link invalid or expired
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <Link
        href="/forgot-password"
        className="mt-2 text-sm font-semibold text-primary hover:underline"
      >
        Request a new reset link
      </Link>
    </Shell>
  );
}

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const info = useResetInfo(token);
  const reset = useResetPassword();

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!token) {
    return (
      <InvalidCard body="This reset link is missing its token. Request a new one to continue." />
    );
  }
  if (info.isLoading) {
    return <Spinner title="Checking your link…" body="One moment." />;
  }
  if (info.isError || !info.data) {
    return (
      <InvalidCard body="This reset link is invalid, already used, or expired. Request a new one to continue." />
    );
  }

  return (
    <Shell>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          For{" "}
          <span className="font-medium text-foreground">{info.data.email}</span>
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) =>
            reset.mutate({ token, password: v.password }),
          )}
          className="w-full space-y-4 text-left"
        >
          <TextField
            control={form.control}
            name="password"
            label="New password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <TextField
            control={form.control}
            name="confirm"
            label="Confirm new password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <Button type="submit" className="w-full" disabled={reset.isPending}>
            <KeyRound className="size-4" />
            {reset.isPending ? "Updating…" : "Update password & sign in"}
          </Button>
        </form>
      </Form>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </Shell>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={<Spinner title="Loading…" body="Preparing your reset." />}
    >
      <ResetPasswordInner />
    </React.Suspense>
  );
}
