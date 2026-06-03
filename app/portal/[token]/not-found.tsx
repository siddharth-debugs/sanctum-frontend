import Link from "next/link";
import { GlassCard } from "@/components/app/glass-card";
import { AuroraBackground } from "@/components/app/aurora-background";

export default function PortalNotFound() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <AuroraBackground />
      <GlassCard strong className="max-w-md p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Link unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This portal link is invalid, expired, or has been revoked. Please ask
          your agency for a fresh link.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Go home
        </Link>
      </GlassCard>
    </div>
  );
}
