"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, MailCheck } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/fields";
import { GlassCard } from "@/components/app/glass-card";
import { useForgotPassword } from "@/hooks/use-auth";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  // The email we submitted, kept so the success message can echo it back.
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  // The backend ALWAYS returns 200 (it never reveals whether the account
  // exists), so we show the same neutral confirmation no matter what.
  const onSubmit = (v: ForgotValues) => {
    forgot.mutate(
      { email: v.email },
      { onSettled: () => setSentTo(v.email) },
    );
  };

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
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {sentTo ? "Check your inbox" : "Forgot your password?"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sentTo
              ? "Follow the link in the email to set a new password."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>
      </div>

      {sentTo ? (
        <div className="space-y-4 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
              <MailCheck className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              If an account exists for{" "}
              <span className="font-medium text-foreground">{sentTo}</span>,
              we&apos;ve sent a reset link. Check your inbox.
            </p>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                placeholder="you@agency.com"
                autoComplete="email"
                required
              />
              <Button
                type="submit"
                className="w-full"
                disabled={forgot.isPending}
              >
                <Mail className="size-4" />
                {forgot.isPending ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </GlassCard>
  );
}
