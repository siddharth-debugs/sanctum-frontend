"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/fields";
import { GlassCard } from "@/components/app/glass-card";
import { useLogin } from "@/hooks/use-auth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const login = useLogin();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

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
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your Sanctum workspace
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => login.mutate(v))}
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
          <div className="space-y-1.5">
            <TextField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={login.isPending}
          >
            <Sparkles className="size-4" />
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Sanctum?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create an agency
        </Link>
      </p>
    </GlassCard>
  );
}
