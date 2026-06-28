"use client";

import * as React from "react";
import {
  Pencil,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/app/status-badge";
import { PlatformBadges, TypeTag } from "@/components/app/platform-badges";
import {
  usePostComments,
  usePostApprovals,
  useAddPostComment,
} from "@/hooks/use-posts";
import { formatDateTime } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import { useCan, useSession } from "@/app/(app)/session-context";
import type { Post, PostComment, PostApproval } from "@/lib/api/types";

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

type ActivityItem =
  | { kind: "approval"; id: string; at: string; data: PostApproval }
  | { kind: "comment"; id: string; at: string; data: PostComment };

/** Client activity (approvals + comments) sized to fill the modal's side column. */
function ActivityPanel({
  clientId,
  postId,
  open,
}: {
  clientId: string;
  postId: string;
  open: boolean;
}) {
  const session = useSession();
  const { canManage } = useCan();
  const canComment = canManage("clients");
  const activePostId = open ? postId : undefined;
  const comments = usePostComments(clientId, activePostId);
  const approvals = usePostApprovals(clientId, activePostId);
  const addComment = useAddPostComment(clientId, postId);
  const [draft, setDraft] = React.useState("");

  // Clear the draft whenever we switch to another post.
  React.useEffect(() => {
    setDraft("");
  }, [postId]);

  const items = React.useMemo<ActivityItem[]>(() => {
    const merged: ActivityItem[] = [
      ...(approvals.data ?? []).map(
        (a): ActivityItem => ({ kind: "approval", id: a.id, at: a.createdAt, data: a }),
      ),
      ...(comments.data ?? []).map(
        (c): ActivityItem => ({ kind: "comment", id: c.id, at: c.createdAt, data: c }),
      ),
    ];
    return merged.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
  }, [approvals.data, comments.data]);

  const loading = comments.isLoading || approvals.isLoading;

  const submit = () => {
    const body = draft.trim();
    if (!body || addComment.isPending) return;
    addComment.mutate(body, { onSuccess: () => setDraft("") });
  };

  return (
    <div className="flex min-h-0 flex-col border-t md:border-t-0">
      <div className="flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-semibold md:border-b">
        <MessageSquare className="size-4 text-muted-foreground" />
        Client activity
        {items.length > 0 && (
          <span className="rounded-full bg-secondary px-1.5 text-xs font-medium text-muted-foreground">
            {items.length}
          </span>
        )}
      </div>

      <div className="space-y-2.5 px-5 pb-3 md:flex-1 md:overflow-y-auto md:py-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading activity…
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            No client activity yet. Approvals and comments from the portal appear
            here.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) =>
              item.kind === "approval" ? (
                <ApprovalRow key={item.id} a={item.data} />
              ) : (
                <CommentRow
                  key={item.id}
                  c={item.data}
                  isMine={item.data.authorUserId === session.user.id}
                />
              ),
            )}
          </ul>
        )}
      </div>

      {canComment && (
        <div className="shrink-0 border-t bg-[color-mix(in_srgb,var(--card)_60%,transparent)] px-5 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply to the client…"
              rows={1}
              className="min-h-9 resize-none py-2 text-sm"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={!draft.trim() || addComment.isPending}
              aria-label="Send reply"
            >
              {addComment.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalRow({ a }: { a: PostApproval }) {
  const approved = a.decision === "approved";
  return (
    <li className="flex gap-2.5 rounded-xl border p-3">
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
          approved
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        )}
      >
        {approved ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <RefreshCw className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">
            {a.actorLabel || "Client"}{" "}
            <span className="font-normal text-muted-foreground">
              {approved ? "approved this post" : "requested changes"}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(a.createdAt)}
          </span>
        </div>
        {a.note && (
          <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{a.note}</p>
        )}
      </div>
    </li>
  );
}

function CommentRow({ c, isMine }: { c: PostComment; isMine: boolean }) {
  const isClient = c.authorType === "client";
  const name = isClient
    ? c.authorLabel || "Client"
    : isMine
      ? "You"
      : c.authorLabel || "Team";
  return (
    <li className="flex gap-2.5 rounded-xl border p-3">
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
          isClient
            ? "bg-primary/15 text-primary"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">
            {name}
            {isClient && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Client
              </span>
            )}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(c.createdAt)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{c.body}</p>
      </div>
    </li>
  );
}

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[56rem]">
        {/* Header */}
        <div className="shrink-0 border-b px-5 py-3.5 pr-12">
          <DialogTitle className="truncate font-display text-lg font-semibold leading-tight">
            {post.caption?.slice(0, 70) || `${TYPE_LABEL[post.postType]} post`}
          </DialogTitle>
          <DialogDescription className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <TypeTag type={post.postType} />
            <span>· {scheduled}</span>
          </DialogDescription>
        </div>

        {/* Body — two columns on desktop, stacked on mobile */}
        <div className="flex flex-1 flex-col overflow-y-auto md:grid md:grid-cols-[1.05fr_0.95fr] md:overflow-hidden">
          {/* Left: media + caption + details */}
          <div className="min-w-0 space-y-4 px-5 py-4 md:overflow-y-auto md:border-r">
            {hero ? (
              <div className="relative grid place-items-center overflow-hidden rounded-xl border bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.secureUrl}
                  alt=""
                  className="max-h-[44vh] w-full object-contain"
                />
                <StatusBadge
                  status={post.status}
                  className="absolute left-3 top-3"
                />
              </div>
            ) : (
              <div className="grid h-44 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No media attached yet
              </div>
            )}
            <div className="whitespace-pre-line rounded-xl bg-[color-mix(in_srgb,var(--muted)_45%,transparent)] p-3.5 text-sm leading-relaxed">
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

          {/* Right: client activity (comments + approvals) */}
          <ActivityPanel clientId={post.clientId} postId={post.id} open={open} />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(post)}>
              <Pencil className="size-4" /> Edit post
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
