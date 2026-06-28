"use client";

import * as React from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, Clock, Pencil, X } from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fmtDuration,
  useTaskTimeLogs,
  useUpdateTimeLogNote,
} from "@/hooks/use-timers";
import { ApiError } from "@/lib/api/client";
import type { TaskTimeLog } from "@/lib/api/types";

/** Format a start instant + duration as "9:04 AM → 9:51 AM · 14 Jun". */
function timeRange(workDate: string, minutes: number): string {
  const start = new Date(workDate);
  const end = new Date(start.getTime() + minutes * 60_000);
  const day = format(start, "d MMM");
  const sameDay = format(start, "yyyyMMdd") === format(end, "yyyyMMdd");
  const startStr = format(start, "h:mm a");
  const endStr = format(end, "h:mm a");
  return sameDay
    ? `${startStr} → ${endStr} · ${day}`
    : `${startStr} ${day} → ${endStr} ${format(end, "d MMM")}`;
}

/* ------------------------------------------------------------------ */
/* One timeline row — who · start→end · duration · editable note.      */
/* ------------------------------------------------------------------ */

function TimelineRow({
  log,
  canEdit,
  onSaveNote,
  saving,
}: {
  log: TaskTimeLog;
  canEdit: boolean;
  onSaveNote: (logId: string, note: string | null) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(log.note ?? "");

  React.useEffect(() => {
    if (!editing) setDraft(log.note ?? "");
  }, [log.note, editing]);

  const commit = () => {
    const next = draft.trim();
    onSaveNote(log.id, next.length > 0 ? next : null);
    setEditing(false);
  };

  return (
    <li className="flex gap-3 py-3">
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarFallback className="text-[10px]">
          {initials(log.userName ?? "?")}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-medium leading-tight">
            {log.userName ?? "Someone"}
          </span>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
            {fmtDuration(log.minutes)}
          </span>
        </div>

        <p className="text-xs tabular-nums text-muted-foreground">
          {timeRange(log.workDate, log.minutes)}
        </p>

        {editing ? (
          <div className="space-y-1.5 pt-1">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What did you work on?"
              rows={2}
              maxLength={2000}
              autoFocus
              className="min-h-[3rem] text-sm"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={commit}
                disabled={saving}
                className="h-8 gap-1"
              >
                <Check className="size-3.5" aria-hidden />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="h-8 gap-1 text-muted-foreground"
              >
                <X className="size-3.5" aria-hidden />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="group/note flex items-start gap-1.5">
            <p
              className={cn(
                "min-w-0 flex-1 whitespace-pre-wrap text-sm leading-snug",
                log.note ? "text-foreground/90" : "italic text-muted-foreground",
              )}
            >
              {log.note || "No note"}
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit note"
                className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/note:opacity-100"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* The timeline section.                                               */
/* ------------------------------------------------------------------ */

export interface TaskTimelineProps {
  projectId: string;
  taskId: string;
  /** Current user id — only one's own logs are editable. */
  currentUserId: string | null;
}

/**
 * Per-task time-log timeline (build §3). Lists every logged session newest
 * first (who · start→end · duration · note), with the task total in the header
 * and an inline note editor on each of the viewer's own entries. Drives off
 * `useTaskTimeLogs`; the parent's start/stop invalidations keep it fresh.
 */
export function TaskTimeline({
  projectId,
  taskId,
  currentUserId,
}: TaskTimelineProps) {
  const { data, isLoading } = useTaskTimeLogs(projectId, taskId);
  const updateNote = useUpdateTimeLogNote(projectId, taskId);

  const onSaveNote = (logId: string, note: string | null) => {
    updateNote.mutate(
      { logId, note },
      {
        onSuccess: () => toast.success("Note updated"),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't update note",
          ),
      },
    );
  };

  const logs = data?.logs ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-semibold">Time log</h3>
        {data && data.totalMinutes > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            Total tracked:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {fmtDuration(data.totalMinutes)}
            </span>
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted/70" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No time logged yet. Start the timer above to track work on this task.
        </p>
      ) : (
        <ul className="divide-y">
          {logs.map((log) => (
            <TimelineRow
              key={log.id}
              log={log}
              canEdit={!!currentUserId && log.userId === currentUserId}
              onSaveNote={onSaveNote}
              saving={updateNote.isPending}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
