"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pin, PinOff, Trash2, Check, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useClientNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "@/hooks/use-crm";
import { useCan } from "@/app/(app)/session-context";
import { NOTE_TYPE_META, NOTE_TYPES } from "@/lib/constants/crm-options";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import type { ClientNoteType } from "@/lib/api/types";

export function ActivityPanel({ clientId }: { clientId: string }) {
  const { data: notes, isLoading } = useClientNotes(clientId);
  const create = useCreateNote(clientId);
  const update = useUpdateNote(clientId);
  const del = useDeleteNote(clientId);
  const { canManage } = useCan();
  const editable = canManage("clients");

  const [type, setType] = React.useState<ClientNoteType>("note");
  const [body, setBody] = React.useState("");

  const add = () => {
    if (!body.trim()) return;
    create.mutate(
      { type, body: body.trim() },
      {
        onSuccess: () => setBody(""),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't add"),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {editable && (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex flex-wrap gap-1.5">
              {NOTE_TYPES.map((t) => {
                const meta = NOTE_TYPE_META[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                      active ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                    style={active ? { background: meta.color, borderColor: "transparent" } : undefined}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Log a call, meeting, or note…"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={add} disabled={create.isPending || !body.trim()}>
                Add to timeline
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : !notes || notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="size-6" />
            No activity yet.
          </div>
        ) : (
          <ol className="space-y-3">
            {notes.map((n) => {
              const meta = NOTE_TYPE_META[n.type];
              return (
                <li key={n.id} className="flex gap-3">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ background: meta.color }}
                  />
                  <div className="min-w-0 flex-1 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-xs">
                        <span className="font-semibold" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-muted-foreground">
                          {n.authorName ?? "Someone"} · {formatRelativeTime(n.createdAt)}
                        </span>
                        {n.pinned && <Pin className="size-3 text-primary" />}
                        {n.completedAt && (
                          <span className="inline-flex items-center gap-0.5 text-success">
                            <Check className="size-3" /> done
                          </span>
                        )}
                      </p>
                      {editable && (
                        <div className="flex items-center gap-0.5">
                          {n.type === "task" && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Toggle done"
                              onClick={() =>
                                update.mutate({ id: n.id, completed: !n.completedAt })
                              }
                            >
                              <Check className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title={n.pinned ? "Unpin" : "Pin"}
                            onClick={() => update.mutate({ id: n.id, pinned: !n.pinned })}
                          >
                            {n.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:text-destructive"
                            onClick={() => del.mutate(n.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{n.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
