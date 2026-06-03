import Link from "next/link";
import { GlassCard } from "@/components/app/glass-card";
import { AuroraBackground } from "@/components/app/aurora-background";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <AuroraBackground />
      <GlassCard strong className="max-w-md p-8 text-center">
        <h1 className="font-display text-5xl font-semibold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That page wandered off. Let&apos;s get you back.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Back to dashboard
        </Link>
      </GlassCard>
    </div>
  );
}
