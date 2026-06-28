"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/fields";
import { GlassCard } from "@/components/app/glass-card";
import { useInviteInfo, useAcceptInvite } from "@/hooks/use-auth";

const acceptSchema = z.object({
  fullName: z.string().min(1, "Your name is required").max(120),
  password: z.string().min(8, "At least 8 characters"),
});
type AcceptValues = z.infer<typeof acceptSchema>;

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

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <Link
        href="/login"
        className="mt-2 text-sm font-semibold text-primary hover:underline"
      >
        Go to sign in
      </Link>
    </Shell>
  );
}

function AcceptInviteInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const info = useInviteInfo(token);
  const accept = useAcceptInvite();

  const form = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { fullName: "", password: "" },
  });

  // Prefill the name the admin entered once the invite resolves.
  React.useEffect(() => {
    if (info.data?.fullName) form.setValue("fullName", info.data.fullName);
  }, [info.data?.fullName, form]);

  if (!token) {
    return (
      <StatusCard
        title="Invalid link"
        body="This invite link is missing its token. Ask your admin to resend it."
      />
    );
  }
  if (info.isLoading) {
    return <StatusCard title="Checking your invite…" body="One moment." />;
  }
  if (info.isError || !info.data) {
    const msg =
      info.error instanceof Error
        ? info.error.message
        : "This invite link is invalid, already used, or expired.";
    return <StatusCard title="Invite not valid" body={msg} />;
  }

  return (
    <Shell>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Join {info.data.agencyName}
        </h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re accepting an invite as{" "}
          <span className="font-medium text-foreground">{info.data.email}</span>.
          Set a password to finish.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) =>
            accept.mutate({
              token,
              password: v.password,
              fullName: v.fullName,
            }),
          )}
          className="w-full space-y-4 text-left"
        >
          <TextField
            control={form.control}
            name="fullName"
            label="Your name"
            placeholder="Jane Doe"
            autoComplete="name"
            required
          />
          <TextField
            control={form.control}
            name="password"
            label="Create a password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <Button type="submit" className="w-full" disabled={accept.isPending}>
            <Sparkles className="size-4" />
            {accept.isPending ? "Setting up…" : "Accept & sign in"}
          </Button>
        </form>
      </Form>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        Already set up?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </Shell>
  );
}

export default function AcceptInvitePage() {
  return (
    <React.Suspense
      fallback={<StatusCard title="Loading…" body="Preparing your invite." />}
    >
      <AcceptInviteInner />
    </React.Suspense>
  );
}
