"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus, Users, Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { InviteMemberSheet } from "@/components/app/invite-member-sheet";
import {
  RoleBadge,
  InactiveChip,
  UtilizationBar,
} from "@/components/app/team-bits";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeam } from "@/hooks/use-team";
import { useDisclosure } from "@/hooks/use-disclosure";
import { initials } from "@/lib/utils";
import { fmtHours } from "@/lib/constants/team-options";
import type { TeamMember } from "@/lib/api/types";

const ALL = "all";

/** Avatar with a pine→brass gradient fallback. */
function MemberAvatar({ member, size = "size-11" }: { member: TeamMember; size?: string }) {
  const name = member.fullName ?? member.email;
  return (
    <Avatar className={size}>
      <AvatarFallback
        className="text-sm font-bold text-primary-foreground"
        style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** A directory member card linking to the detail page. */
function MemberCard({ member }: { member: TeamMember }) {
  const name = member.fullName ?? member.email;
  const disabled = member.status === "disabled";
  const pct = Math.round(member.utilizationPct ?? 0);
  return (
    <Link
      href={`/team/${member.id}`}
      className="group block rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <MemberAvatar member={member} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold leading-tight">
                {name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {member.designation || member.email}
              </p>
            </div>
            {disabled && <InactiveChip />}
          </div>
          <div className="mt-2">
            <RoleBadge role={member.role} label={member.roleName} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{member.activeTaskCount}</span>{" "}
        {member.activeTaskCount === 1 ? "task" : "tasks"} ·{" "}
        <span className="font-medium text-foreground">{member.projectCount}</span>{" "}
        {member.projectCount === 1 ? "project" : "projects"}
      </p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Utilization</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
        <UtilizationBar pct={pct} />
      </div>
    </Link>
  );
}

function DirectoryTab({ onInvite }: { onInvite: () => void }) {
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState(ALL);
  const [activeOnly, setActiveOnly] = React.useState(false);

  const { data, isLoading, error } = useTeam();

  const members = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((m) => {
      if (role !== ALL && m.role !== role) return false;
      if (activeOnly && m.status !== "active") return false;
      if (q) {
        const name = (m.fullName ?? "").toLowerCase();
        if (!name.includes(q) && !m.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, search, role, activeOnly]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 sm:py-0 sm:h-9">
          <Switch
            id="active-only"
            checked={activeOnly}
            onCheckedChange={setActiveOnly}
          />
          <Label htmlFor="active-only" className="cursor-pointer whitespace-nowrap text-sm">
            Active only
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <GlassCard className="p-10 text-center text-sm text-muted-foreground">
          Couldn&apos;t load your team. Please retry.
        </GlassCard>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
            <Users className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold">No members found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {data && data.length > 0
                ? "No members match your filters."
                : "Invite your first teammate to start delegating work."}
            </p>
          </div>
          <Button onClick={onInvite}>
            <UserPlus className="size-4" /> Invite member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function UtilizationTab() {
  const { data, isLoading, error } = useTeam();

  const rows = React.useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => (b.utilizationPct ?? 0) - (a.utilizationPct ?? 0),
      ),
    [data],
  );

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }
  if (error) {
    return (
      <GlassCard className="p-10 text-center text-sm text-muted-foreground">
        Couldn&apos;t load utilization. Please retry.
      </GlassCard>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No members to show yet.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly utilization</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Header row (md+) */}
        <div className="hidden grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-4 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <span>Member</span>
          <span className="text-right">Weekly capacity</span>
          <span className="text-right">Logged this week</span>
          <span>Utilization</span>
        </div>
        <ul className="divide-y">
          {rows.map((m) => {
            const pct = Math.round(m.utilizationPct ?? 0);
            const name = m.fullName ?? m.email;
            return (
              <li key={m.id} className="py-3">
                <Link
                  href={`/team/${m.id}`}
                  className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_1fr_1fr_1.4fr] md:items-center md:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <MemberAvatar member={m} size="size-9" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.designation || m.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums md:text-right">
                    <span className="text-muted-foreground md:hidden">Capacity: </span>
                    {m.weeklyCapacityHrs}h
                  </span>
                  <span className="text-sm tabular-nums md:text-right">
                    <span className="text-muted-foreground md:hidden">Logged: </span>
                    {fmtHours(m.loggedMinutesThisWeek)}
                  </span>
                  <div className="flex items-center gap-3">
                    <UtilizationBar pct={pct} tintByLoad className="flex-1" />
                    <span className="w-12 text-right text-sm font-semibold tabular-nums">
                      {pct}%
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function TeamPage() {
  const inviteSheet = useDisclosure();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <Users className="size-3" /> Team
          </>
        }
        title="Team"
        description="Manage your members and track utilization."
        actions={
          <Button onClick={() => inviteSheet.onOpen()}>
            <UserPlus className="size-4" /> Invite Member
          </Button>
        }
      />

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="mt-5">
          <DirectoryTab onInvite={() => inviteSheet.onOpen()} />
        </TabsContent>
        <TabsContent value="utilization" className="mt-5">
          <UtilizationTab />
        </TabsContent>
      </Tabs>

      <InviteMemberSheet
        open={inviteSheet.open}
        onOpenChange={inviteSheet.setOpen}
      />
    </div>
  );
}
