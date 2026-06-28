"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Sparkles,
  CalendarDays,
  LayoutList,
  Share2,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFacet,
} from "@/components/app/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/app/status-badge";
import { PlatformBadges, TypeTag } from "@/components/app/platform-badges";
import { ContentCalendar } from "@/components/app/content-calendar";
import { PostFormSheet } from "@/components/app/post-form-sheet";
import { PostViewModal } from "@/components/app/post-view-modal";
import { usePosts } from "@/hooks/use-posts";
import { useClient } from "@/hooks/use-clients";
import { useGenerateMonth } from "@/hooks/use-ai";
import { useUsage } from "@/hooks/use-usage";
import { PortalShareDialog } from "@/components/app/portal-share-dialog";
import { useDisclosure } from "@/hooks/use-disclosure";
import { formatDateTime } from "@/lib/utils";
import { useCan, useSession } from "../../../session-context";
import type { Post } from "@/lib/api/types";

const CURRENT_MONTH = "2026-06";

const TYPE_LABEL: Record<Post["postType"], string> = {
  reel: "Reel",
  story: "Story",
  carousel: "Carousel",
  post: "Post",
};

/** Short secondary line for a post row (no `title` exists on the backend). */
function postTitleHint(p: Post): string {
  return `${TYPE_LABEL[p.postType]} · ${p.platforms.join(", ") || "no platforms"}`;
}

const STATUS_FACET: DataTableFacet = {
  columnId: "status",
  title: "Status",
  options: [
    { label: "Draft", value: "draft" },
    { label: "Pending", value: "pending_approval" },
    { label: "Approved", value: "approved" },
    { label: "Changes", value: "changes_requested" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Posted", value: "posted" },
  ],
};

const TYPE_FACET: DataTableFacet = {
  columnId: "postType",
  title: "Type",
  options: [
    { label: "Reel", value: "reel" },
    { label: "Story", value: "story" },
    { label: "Carousel", value: "carousel" },
    { label: "Post", value: "post" },
  ],
};

export default function ClientCalendarPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = React.use(params);
  const { data: client } = useClient(clientId);
  const { data: posts, isLoading, error: postsError } = usePosts(clientId);
  const generateMonth = useGenerateMonth(clientId);
  const { data: usage } = useUsage();
  const shareDialog = useDisclosure();
  const { canManage } = useCan();
  const session = useSession();
  const isPrivileged =
    session.user.role === "owner" || session.user.role === "admin";

  const ai = usage?.usage?.ai;
  const aiIndicator = ai
    ? ai.limit == null
      ? `${ai.used}/∞ AI this month`
      : `${ai.used}/${ai.limit} AI this month`
    : null;
  const formSheet = useDisclosure<Post | null>();
  const viewModal = useDisclosure<Post>();
  // Prefill "Scheduled for" when adding a post from a calendar day cell.
  const [addDay, setAddDay] = React.useState<Date | undefined>(undefined);

  // Deep link: /clients/:id/calendar?post=<id> (from a notification) opens that
  // post's detail + thread, then cleans the param so a refresh won't reopen.
  // Reactive to the query param so it fires even when we're ALREADY on this page
  // and a notification soft-navigates to a new ?post= value.
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledPost = React.useRef<string | null>(null);
  React.useEffect(() => {
    const postId = searchParams.get("post");
    // Reset when the param is gone so the SAME notification can re-open later.
    if (!postId) {
      handledPost.current = null;
      return;
    }
    if (!posts) return; // wait for posts to load, then handle once.
    if (handledPost.current === postId) return; // already opened this one.
    handledPost.current = postId;
    const target = posts.find((p) => p.id === postId);
    if (target) viewModal.onOpen(target);
    // Best-effort: clear the param so a refresh won't reopen.
    router.replace(`/clients/${clientId}/calendar`, { scroll: false });
  }, [posts, searchParams, clientId, viewModal, router]);

  const columns = React.useMemo<ColumnDef<Post>[]>(
    () => [
      {
        accessorKey: "caption",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Post" />
        ),
        cell: ({ row }) => {
          const p = row.original;
          const thumb = p.media?.[0]?.secureUrl;
          return (
            <div className="flex items-center gap-3">
              {thumb ? (
                <span
                  className="size-10 shrink-0 rounded-[10px] bg-cover bg-center ring-1 ring-border"
                  style={{ backgroundImage: `url(${thumb})` }}
                />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-secondary text-xs">
                  {p.postType[0].toUpperCase()}
                </span>
              )}
              <div>
                <div className="line-clamp-1 max-w-[260px] font-semibold">
                  {p.caption || "Untitled post"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {postTitleHint(p)}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "postType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => <TypeTag type={row.original.postType} />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "platforms",
        header: "Platforms",
        cell: ({ row }) => <PlatformBadges platforms={row.original.platforms} />,
      },
      {
        accessorKey: "scheduledAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Scheduled" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {row.original.scheduledAt
              ? formatDateTime(row.original.scheduledAt)
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: client?.name ?? "Client" },
        ]}
        kicker={
          <>
            <CalendarDays className="size-3" /> Content calendar
          </>
        }
        title={`${client?.name ?? "Client"} — June`}
        description="Plan the month, send posts for approval, and share a branded read-only portal."
        actions={
          // items-start keeps every button top-aligned; the AI-usage caption
          // hangs below "Generate" without nudging the others out of line.
          <div className="flex flex-wrap items-start gap-2">
            {canManage("ai") && (
              <div className="flex flex-col items-stretch gap-1">
                <Button
                  variant="accent"
                  disabled={generateMonth.isPending}
                  onClick={() => generateMonth.mutate({ month: CURRENT_MONTH })}
                >
                  <Sparkles className="size-4" />
                  {generateMonth.isPending
                    ? "Generating…"
                    : "Generate month with AI"}
                </Button>
                {aiIndicator && (
                  <span className="text-center text-[11px] font-medium tabular-nums text-muted-foreground">
                    {aiIndicator}
                  </span>
                )}
              </div>
            )}
            {isPrivileged && (
              <Button variant="outline" onClick={() => shareDialog.onOpen()}>
                <Share2 className="size-4" /> Share portal
              </Button>
            )}
            {canManage("clients") && (
              <Button
                onClick={() => {
                  setAddDay(undefined);
                  formSheet.onOpen(null);
                }}
              >
                <Plus className="size-4" /> New post
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            <LayoutList className="size-4" /> List
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="size-4" /> Calendar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <DataTable
            columns={columns}
            data={posts ?? []}
            isLoading={isLoading}
            error={postsError ? "Couldn't load posts. Please retry." : null}
            searchKey="caption"
            searchPlaceholder="Search posts…"
            facets={[STATUS_FACET, TYPE_FACET]}
            getRowId={(p) => p.id}
            onRowClick={(p) => viewModal.onOpen(p)}
            emptyIcon={<CalendarDays className="size-8" />}
            emptyTitle="No posts yet"
            emptyDescription="Create a post or generate a month of drafts with AI."
            emptyAction={
              canManage("clients") ? (
                <Button
                  onClick={() => {
                    setAddDay(undefined);
                    formSheet.onOpen(null);
                  }}
                >
                  <Plus className="size-4" /> New post
                </Button>
              ) : undefined
            }
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <ContentCalendar
            clientId={clientId}
            posts={posts ?? []}
            onPostClick={(p) => viewModal.onOpen(p)}
            onAddPost={
              canManage("clients")
                ? (day) => {
                    // Default new posts to 9:00 AM on the chosen day.
                    const at = new Date(day);
                    at.setHours(9, 0, 0, 0);
                    setAddDay(at);
                    formSheet.onOpen(null);
                  }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>

      <PostFormSheet
        open={formSheet.open}
        onOpenChange={formSheet.setOpen}
        clientId={clientId}
        post={formSheet.data}
        initialScheduledAt={addDay}
      />
      <PostViewModal
        open={viewModal.open}
        onOpenChange={viewModal.setOpen}
        post={viewModal.data}
        onEdit={(p) => {
          viewModal.onClose();
          formSheet.onOpen(p);
        }}
      />
      <PortalShareDialog
        open={shareDialog.open}
        onOpenChange={shareDialog.setOpen}
        clientId={clientId}
        clientName={client?.name ?? "this client"}
      />
    </div>
  );
}
