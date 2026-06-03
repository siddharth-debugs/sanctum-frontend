"use client";

import { Pencil } from "lucide-react";

import { ViewModal } from "@/components/app/view-modal";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/status-badge";
import { PlatformBadges } from "@/components/app/platform-badges";
import { formatDateTime } from "@/lib/utils";
import type { Post } from "@/lib/api/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

const TYPE_LABEL: Record<Post["postType"], string> = {
  reel: "Reel",
  story: "Story",
  carousel: "Carousel",
  post: "Post",
};

export function PostViewModal({
  open,
  onOpenChange,
  post,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: Post | null;
  onEdit?: (post: Post) => void;
}) {
  if (!post) return null;
  const hero = post.media?.[0];
  const scheduled = post.scheduledAt
    ? formatDateTime(post.scheduledAt)
    : "unscheduled";

  return (
    <ViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={post.caption?.slice(0, 60) || `${TYPE_LABEL[post.postType]} post`}
      description={`${TYPE_LABEL[post.postType]} · ${scheduled}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(post)}>
              <Pencil className="size-4" /> Edit post
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {hero && (
          <div className="relative h-40 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.secureUrl}
              alt=""
              className="size-full object-cover"
            />
            <StatusBadge status={post.status} className="absolute left-3 top-3" />
          </div>
        )}
        <div className="rounded-xl bg-[color-mix(in_srgb,var(--muted)_45%,transparent)] p-3.5 text-sm leading-relaxed">
          {post.caption || (
            <span className="text-muted-foreground">No caption yet.</span>
          )}
        </div>
        <div>
          <DetailRow label="Format">{TYPE_LABEL[post.postType]}</DetailRow>
          <DetailRow label="Platforms">
            <PlatformBadges platforms={post.platforms} />
          </DetailRow>
          <DetailRow label="Scheduled">{scheduled}</DetailRow>
          <DetailRow label="Status">
            <StatusBadge status={post.status} />
          </DetailRow>
          {post.aiGenerationId && (
            <DetailRow label="Source">AI generated</DetailRow>
          )}
        </div>
      </div>
    </ViewModal>
  );
}
