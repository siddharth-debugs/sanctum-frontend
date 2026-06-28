"use client";

import * as React from "react";
import {
  Activity,
  Clock,
  LogIn,
  LogOut,
  UserPlus,
  UserCog,
  Trash2,
  FolderKanban,
  CheckSquare,
  FileText,
  Receipt,
  CalendarCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMemberActivity } from "@/hooks/use-team";
import { formatRelativeTime } from "@/lib/relative-time";
import { formatDateTime } from "@/lib/utils";
import type { TeamActivityEvent } from "@/lib/api/types";

/**
 * Map a dotted audit action (e.g. "attendance.check_in") to a friendly label
 * and icon. Falls back to a humanized version of the action string.
 */
const ACTION_META: Record<string, { label: string; icon: LucideIcon }> = {
  "auth.login": { label: "Signed in", icon: LogIn },
  "auth.logout": { label: "Signed out", icon: LogOut },
  "attendance.check_in": { label: "Checked in", icon: LogIn },
  "attendance.check_out": { label: "Checked out", icon: LogOut },
  "attendance.mark": { label: "Marked attendance", icon: CalendarCheck },
  "attendance.policy.update": { label: "Updated attendance policy", icon: ShieldCheck },
  "attendance.holiday.create": { label: "Added a holiday", icon: CalendarCheck },
  "timer.start": { label: "Started a timer", icon: Clock },
  "timer.stop": { label: "Stopped a timer", icon: Clock },
  "timer.log.edit": { label: "Edited a time log", icon: Clock },
  "team.invite": { label: "Invited a member", icon: UserPlus },
  "team.update": { label: "Updated a member", icon: UserCog },
  "team.delete": { label: "Removed a member", icon: Trash2 },
  "team.time_log.create": { label: "Logged time", icon: Clock },
  "client.assign": { label: "Assigned a client", icon: UserCog },
  "project.create": { label: "Created a project", icon: FolderKanban },
  "project.update": { label: "Updated a project", icon: FolderKanban },
  "task.create": { label: "Created a task", icon: CheckSquare },
  "task.update": { label: "Updated a task", icon: CheckSquare },
  "post.create": { label: "Created a post", icon: FileText },
  "expense.create": { label: "Logged an expense", icon: Receipt },
};

function humanize(action: string): string {
  return action
    .split(".")
    .join(" ")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function describe(ev: TeamActivityEvent): string {
  const base = ACTION_META[ev.action]?.label ?? humanize(ev.action);
  const meta = ev.metadata ?? {};
  // Surface a useful detail when present.
  if (typeof meta.minutes === "number") {
    const h = Math.floor(meta.minutes / 60);
    const m = meta.minutes % 60;
    const pretty = h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    return `${base} · ${pretty}`;
  }
  if (typeof meta.taskTitle === "string") return `${base} · ${meta.taskTitle}`;
  if (typeof meta.role === "string") return `${base} · ${meta.role}`;
  if (typeof meta.status === "string") return `${base} · ${meta.status}`;
  if (typeof meta.name === "string") return `${base} · ${meta.name}`;
  return base;
}

function ActivityRow({ ev }: { ev: TeamActivityEvent }) {
  const Icon = ACTION_META[ev.action]?.icon ?? Activity;
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{describe(ev)}</p>
        <p
          className="text-xs text-muted-foreground"
          title={formatDateTime(ev.createdAt)}
        >
          {formatRelativeTime(ev.createdAt)}
        </p>
      </div>
    </li>
  );
}

/** Recent audit-log events performed by a member. */
export function MemberActivityFeed({
  memberId,
  enabled = true,
}: {
  memberId: string;
  enabled?: boolean;
}) {
  const { data, isLoading, error } = useMemberActivity(memberId, enabled);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Couldn&apos;t load activity. Please retry.
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
          <Activity className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="font-display text-base font-semibold">No recent activity</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Check-ins, time logs, and edits this member makes will show up here.
          </p>
        </div>
      </div>
    );
  }

  return <ul className="divide-y">{data.map((ev) => <ActivityRow key={ev.id} ev={ev} />)}</ul>;
}
