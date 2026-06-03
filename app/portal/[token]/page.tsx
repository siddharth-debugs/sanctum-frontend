"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Sparkles } from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { PortalPostCard } from "@/components/app/portal-post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { portalApi } from "@/lib/api/portal-client";
import { queryKeys } from "@/lib/api/query-keys";
import { ApiError } from "@/lib/api/client";
import { initials } from "@/lib/utils";

export default function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = React.use(params);
  const actorLabel = "Client";

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.portal(token),
    queryFn: () => portalApi.resolve(token),
    retry: false,
  });

  if (error instanceof ApiError && (error.status === 404 || error.status === 410)) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <GlassCard strong className="max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">
            Link unavailable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This portal link is invalid, expired, or revoked.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Branded header */}
      <header className="mb-8">
        <GlassCard strong className="flex items-center gap-4 p-5">
          {isLoading ? (
            <Skeleton className="size-12 rounded-xl" />
          ) : (
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl text-lg font-bold text-white"
              style={{
                background: data?.client.brandColor ?? "var(--primary)",
              }}
            >
              {data ? initials(data.client.name) : "—"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl font-semibold tracking-tight">
              {isLoading ? <Skeleton className="h-6 w-40" /> : data?.client.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {isLoading ? (
                <Skeleton className="mt-1 h-4 w-28" />
              ) : (
                <>Content review · by {data?.agency?.name ?? "your agency"}</>
              )}
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-xs font-semibold text-primary sm:inline-flex">
            <Sparkles className="size-3" /> Read-only portal
          </span>
        </GlassCard>
      </header>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          Upcoming content
        </h2>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.posts.length} post{data.posts.length === 1 ? "" : "s"} to review
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : data && data.posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.posts.map((post) => (
            <PortalPostCard
              key={post.id}
              token={token}
              post={post}
              actorLabel={actorLabel}
              canApprove={data.portal.canApprove}
              canComment={data.portal.canComment}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="flex flex-col items-center gap-2 p-12 text-center">
          <CheckCircle2 className="size-8 text-success" />
          <p className="font-display text-base font-semibold">All caught up</p>
          <p className="text-sm text-muted-foreground">
            There's nothing waiting for your review right now.
          </p>
        </GlassCard>
      )}

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Powered by Sanctum · This is a read-only link. Approvals and comments are
        recorded for your agency.
      </footer>
    </div>
  );
}
