"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MODULE_LABELS } from "@/lib/permissions";
import type { ModuleKey } from "@/lib/api/types";

/**
 * Shown when a user navigates (directly) to a module their permissions don't
 * grant. The sidebar already hides these, but this guards deep links / stale
 * tabs after an owner restricts access.
 */
export function NoModuleAccess({
  module,
  fallbackHref = "/dashboard",
}: {
  module: ModuleKey | null;
  fallbackHref?: string;
}) {
  const label = module ? MODULE_LABELS[module] : "this area";
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        <Lock className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          You don&apos;t have access to {label}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your role doesn&apos;t include access to this module. Ask an owner or
          admin to grant it from the Team page.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href={fallbackHref}>Go to a page you can access</Link>
      </Button>
    </div>
  );
}
