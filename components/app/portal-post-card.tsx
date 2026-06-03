"use client";

import * as React from "react";
import {
  Check,
  MessageSquare,
  PencilLine,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/app/glass-card";
import { StatusBadge } from "@/components/app/status-badge";
import { PlatformBadges, TypeTag } from "@/components/app/platform-badges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import { portalApi } from "@/lib/api/portal-client";
import { ApiError } from "@/lib/api/client";
import type { PortalPost } from "@/lib/api/types";

export function PortalPostCard({
  token,
  post,
  actorLabel,
  canApprove,
  canComment,
}: {
  token: string;
  post: PortalPost;
  actorLabel: string;
  canApprove: boolean;
  canComment: boolean;
}) {
  const initialDecision =
    post.status === "approved"
      ? "approved"
      : post.status === "changes_requested"
        ? "changes_requested"
        : null;
  const [decision, setDecision] =
    React.useState<"approved" | "changes_requested" | null>(initialDecision);
  const [status, setStatus] = React.useState(post.status);
  const [showComment, setShowComment] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState<"approve" | "changes" | "comment" | null>(
    null,
  );

  const decide = async (d: "approved" | "changes_requested") => {
    setBusy(d === "approved" ? "approve" : "changes");
    try {
      await portalApi.decide(token, post.id, d, undefined, actorLabel);
      setDecision(d);
      setStatus(d === "approved" ? "approved" : "changes_requested");
      toast.success(d === "approved" ? "Approved" : "Changes requested");
      if (d === "changes_requested") setShowComment(true);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't submit your decision",
      );
    } finally {
      setBusy(null);
    }
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    setBusy("comment");
    try {
      await portalApi.comment(token, post.id, comment, actorLabel);
      setComment("");
      setShowComment(false);
      toast.success("Comment sent");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't send your comment",
      );
    } finally {
      setBusy(null);
    }
  };

  const hero = post.media?.[0];

  return (
    <GlassCard className="overflow-hidden">
      {hero && (
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.secureUrl}
            alt=""
            className="size-full object-cover"
          />
          <StatusBadge status={status} className="absolute left-3 top-3" />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <TypeTag type={post.postType} />
          <PlatformBadges platforms={post.platforms} />
          <span className="ml-auto text-xs text-muted-foreground">
            {post.scheduledAt ? formatDateTime(post.scheduledAt) : "Unscheduled"}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {post.caption || "No caption."}
        </p>

        {decision === "approved" ? (
          <div className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--success)_14%,transparent)] px-3 py-2 text-sm font-medium text-success">
            <Check className="size-4" /> You approved this post
          </div>
        ) : (
          canApprove && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1"
                disabled={busy !== null}
                onClick={() => decide("approved")}
              >
                {busy === "approve" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={busy !== null}
                onClick={() => decide("changes_requested")}
              >
                {busy === "changes" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PencilLine className="size-4" />
                )}
                Request changes
              </Button>
            </div>
          )
        )}

        {canComment && (
          <>
            {!showComment ? (
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                onClick={() => setShowComment(true)}
              >
                <MessageSquare className="size-4" />
                Add a comment
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Leave feedback for the team…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowComment(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy === "comment" || !comment.trim()}
                    onClick={submitComment}
                  >
                    {busy === "comment" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </GlassCard>
  );
}
