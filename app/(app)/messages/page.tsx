"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessagesSquare, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useThreads } from "@/hooks/use-messages";
import type { ThreadStatus, ThreadSummary } from "@/lib/api/types";
import { NewThreadSheet } from "@/components/app/new-thread-sheet";
import { ThreadListItem } from "@/components/app/messages/thread-list-item";
import {
  ConversationPane,
  ConversationEmpty,
} from "@/components/app/messages/conversation-pane";

type FilterTab = "all" | "open" | "awaiting";

function matchesSearch(thread: ThreadSummary, q: string): boolean {
  if (!q) return true;
  const haystack = [
    thread.subject,
    thread.lastMessagePreview ?? "",
    thread.clientName ?? "",
    thread.projectName ?? "",
    ...thread.participants.map((p) => p.name),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("thread");

  const [tab, setTab] = React.useState<FilterTab>("all");
  const [search, setSearch] = React.useState("");
  const [newOpen, setNewOpen] = React.useState(false);

  const statusFilter: ThreadStatus | undefined =
    tab === "open" ? "open" : tab === "awaiting" ? "awaiting" : undefined;

  const { data: threads, isLoading } = useThreads({ status: statusFilter });

  const select = React.useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("thread", id);
      else params.delete("thread");
      router.replace(`/messages?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (threads ?? []).filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      return matchesSearch(t, q);
    });
  }, [threads, search, statusFilter]);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-xl border bg-[var(--card)]">
      {/* LEFT — thread list */}
      <aside className="flex w-full max-w-[360px] shrink-0 flex-col border-r md:w-[360px]">
        <div className="shrink-0 space-y-3 border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 font-display text-lg font-semibold">
              <MessagesSquare className="size-5 text-primary" />
              Messages
            </h1>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" /> New
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="pl-9"
            />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="open" className="flex-1">
                Open
              </TabsTrigger>
              <TabsTrigger value="awaiting" className="flex-1">
                Awaiting
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
                <MessagesSquare className="size-5" />
              </span>
              <p className="text-sm font-medium">No threads found</p>
              <p className="text-xs text-muted-foreground">
                {search || statusFilter
                  ? "Try a different search or filter."
                  : "Start a conversation with your team."}
              </p>
            </div>
          ) : (
            filtered.map((t) => (
              <ThreadListItem
                key={t.id}
                thread={t}
                active={t.id === selectedId}
                onSelect={select}
              />
            ))
          )}
        </div>
      </aside>

      {/* RIGHT — conversation */}
      <section className={cn("hidden min-h-0 flex-1 md:flex md:flex-col")}>
        {selectedId ? (
          <ConversationPane key={selectedId} threadId={selectedId} />
        ) : (
          <ConversationEmpty onNew={() => setNewOpen(true)} />
        )}
      </section>

      {/* On mobile, the conversation overlays the list when one is selected. */}
      {selectedId && (
        <section className="absolute inset-0 z-20 flex flex-col bg-[var(--card)] md:hidden">
          <ConversationPane key={`m-${selectedId}`} threadId={selectedId} />
        </section>
      )}

      <NewThreadSheet
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(thread) => select(thread.id)}
      />
    </div>
  );
}
