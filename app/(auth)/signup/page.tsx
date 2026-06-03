"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Rocket } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/fields";
import { GlassCard } from "@/components/app/glass-card";
import { useSignup } from "@/hooks/use-auth";

const signupSchema = z.object({
  agencyName: z.string().min(2, "Add your agency name"),
  name: z.string().min(2, "Add your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const signup = useSignup();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { agencyName: "", name: "", email: "", password: "" },
  });

  return (
    <GlassCard strong className="w-full max-w-md p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div
          className="grid size-12 place-items-center rounded-lg font-display text-2xl font-semibold text-primary-foreground"
          style={{
            background:
              "linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 70%,var(--primary)))",
          }}
        >
          S
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Create your agency
          </h1>
          <p className="text-sm text-muted-foreground">
            Start planning content in minutes
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => signup.mutate(v))}
          className="space-y-4"
        >
          <TextField
            control={form.control}
            name="agencyName"
            label="Agency name"
            placeholder="Bloom Studio"
            required
          />
          <TextField
            control={form.control}
            name="name"
            label="Your name"
            placeholder="Siddharth K."
            autoComplete="name"
            required
          />
          <TextField
            control={form.control}
            name="email"
            label="Work email"
            type="email"
            placeholder="you@agency.com"
            autoComplete="email"
            required
          />
          <TextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <Button
            type="submit"
            className="w-full"
            disabled={signup.isPending}
          >
            <Rocket className="size-4" />
            {signup.isPending ? "Creating…" : "Create agency"}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </GlassCard>
  );
}
