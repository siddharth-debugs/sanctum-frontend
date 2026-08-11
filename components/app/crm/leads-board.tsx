"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  AlertCircle,
  CalendarClock,
  Inbox,
  ArrowRightLeft,
  Ban,
  Undo2,
  Trash2,
  ExternalLink,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/app/glass-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeadDetailSheet } from "@/components/app/crm/lead-detail-sheet";
import {
  useLeads,
  useLeadStats,
  useCreateLead,
  useUpdateLead,
  useConvertLead,
  useDeleteLead,
  type LeadBucket,
  type LeadInput,
} from "@/hooks/use-leads";
import { useCan } from "@/app/(app)/session-context";
import {
  LEAD_OPEN_STAGES,
  LEAD_STAGE_META,
} from "@/lib/constants/crm-options";
import { toPaise, formatINRCompact } from "@/lib/money";
import { ApiError } from "@/lib/api/client";
import { formatDate, cn } from "@/lib/utils";
import type { Lead, LeadStage } from "@/lib/api/types";

type View = "pipeline" | "converted" | "bin";

const VIEW_BUCKET: Record<View, LeadBucket> = {
  pipeline: "open",
  converted: "converted",
  bin: "bin",
};

const errMsg = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

export function LeadsBoard({ initialLeadId }: { initialLeadId?: string | null }) {
  const { canManage } = useCan();
  const editable = canManage("clients");

  const [view, setView] = React.useState<View>("pipeline");
  const [detailId, setDetailId] = React.useState<string | null>(
    initialLeadId ?? null,
  );
  const [detailOpen, setDetailOpen] = React.useState(!!initialLeadId);
  const [createOpen, setCreateOpen] = React.useState(false);

  // Deep link: open the detail sheet when the page passes a lead id in.
  React.useEffect(() => {
    if (initialLeadId) {
      setDetailId(initialLeadId);
      setDetailOpen(true);
    }
  }, [initialLeadId]);

  const { data: stats } = useLeadStats();

  const openLead = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border bg-card p-1">
          <SegBtn
            active={view === "pipeline"}
            onClick={() => setView("pipeline")}
            label="Pipeline"
            count={stats?.open}
          />
          <SegBtn
            active={view === "converted"}
            onClick={() => setView("converted")}
            label="Converted"
            count={stats?.converted}
          />
          <SegBtn
            active={view === "bin"}
            onClick={() => setView("bin")}
            label="Bin"
            count={stats?.bin}
          />
        </div>
        {editable && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New lead
          </Button>
        )}
      </div>

      {view === "pipeline" && (
        <PipelineView editable={editable} onOpen={openLead} />
      )}
      {view === "converted" && <ConvertedView onOpen={openLead} />}
      {view === "bin" && <BinView editable={editable} onOpen={openLead} />}

      <LeadDetailSheet
        leadId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        editable={editable}
      />
      <NewLeadDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {count != null && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[11px] tabular-nums",
            active ? "bg-primary-foreground/20" : "bg-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pipeline (kanban: New / Contacted / Qualified)
// ---------------------------------------------------------------------------

function PipelineView({
  editable,
  onOpen,
}: {
  editable: boolean;
  onOpen: (id: string) => void;
}) {
  const { data, isLoading } = useLeads({ bucket: "open" });

  const byStage = React.useMemo(() => {
    const map: Record<string, Lead[]> = { new: [], contacted: [], qualified: [] };
    for (const l of data ?? []) {
      if (map[l.stage]) map[l.stage].push(l);
    }
    return map;
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {LEAD_OPEN_STAGES.map((stage) => {
        const items = byStage[stage] ?? [];
        const meta = LEAD_STAGE_META[stage];
        return (
          <GlassCard key={stage} className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <span
                  className="size-2 rounded-full"
                  style={{ background: meta.color }}
                />
                {meta.label}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="py-8 text-center text-[11px] text-muted-foreground">
                  No leads here
                </p>
              ) : (
                items.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    editable={editable}
                    onOpen={onOpen}
                  />
                ))
              )}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

function LeadCard({
  lead,
  editable,
  onOpen,
}: {
  lead: Lead;
  editable: boolean;
  onOpen: (id: string) => void;
}) {
  const update = useUpdateLead();
  const convert = useConvertLead();
  const router = useRouter();

  const move = (stage: LeadStage) =>
    update.mutate(
      { id: lead.id, patch: { stage } },
      {
        onSuccess: () =>
          toast.success(`Moved to ${LEAD_STAGE_META[stage].label}`),
        onError: (e) => toast.error(errMsg(e, "Couldn't move lead")),
      },
    );

  const doConvert = () =>
    convert.mutate(
      { id: lead.id },
      {
        onSuccess: (res) => {
          toast.success("Converted to client");
          router.push(`/clients/${res.clientId}`);
        },
        onError: (e) => toast.error(errMsg(e, "Couldn't convert")),
      },
    );

  const overdue = !!lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < Date.now();

  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(lead.id)}
        >
          <p className="truncate text-xs font-semibold">{lead.name}</p>
          {lead.company && (
            <p className="truncate text-[11px] text-muted-foreground">
              {lead.company}
            </p>
          )}
        </button>
        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Move to</DropdownMenuLabel>
              {LEAD_OPEN_STAGES.filter((s) => s !== lead.stage).map((s) => (
                <DropdownMenuItem key={s} onClick={() => move(s)}>
                  <span
                    className="size-2 rounded-full"
                    style={{ background: LEAD_STAGE_META[s].color }}
                  />
                  {LEAD_STAGE_META[s].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doConvert}>
                <ArrowRightLeft className="size-3.5" /> Convert
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => move("lost")}>
                <Ban className="size-3.5" /> Mark Lost
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => move("spam")}>
                <Ban className="size-3.5" /> Mark Spam
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {(lead.service || lead.budget) && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {[lead.service, lead.budget].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {lead.estimatedValue != null ? (
          <span className="text-[11px] font-medium tabular-nums">
            {formatINRCompact(lead.estimatedValue)}
          </span>
        ) : (
          <span />
        )}
        {lead.openFollowUps > 0 && lead.nextFollowUpAt && (
          <Badge
            variant={overdue ? "destructive" : "secondary"}
            className="gap-1 text-[10px]"
          >
            {overdue ? (
              <AlertCircle className="size-2.5" />
            ) : (
              <CalendarClock className="size-2.5" />
            )}
            {formatDate(lead.nextFollowUpAt)}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Converted
// ---------------------------------------------------------------------------

function ConvertedView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading } = useLeads({ bucket: "converted" });
  const router = useRouter();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No converted leads yet"
        description="When you convert a lead, the new client shows up here."
      />
    );
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {data.map((l) => (
        <div
          key={l.id}
          className="flex items-center justify-between gap-3 p-3"
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onOpen(l.id)}
          >
            <p className="truncate text-sm font-semibold">{l.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {l.company || "No company"}
              {l.estimatedValue != null
                ? ` · ${formatINRCompact(l.estimatedValue)}`
                : ""}
            </p>
          </button>
          {l.convertedClientId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/clients/${l.convertedClientId}`)}
            >
              <ExternalLink className="size-3.5" />
              {l.convertedClientName || "Open client"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bin (lost / spam)
// ---------------------------------------------------------------------------

function BinView({
  editable,
  onOpen,
}: {
  editable: boolean;
  onOpen: (id: string) => void;
}) {
  const { data, isLoading } = useLeads({ bucket: "bin" });
  const update = useUpdateLead();
  const del = useDeleteLead();
  const [confirm, setConfirm] = React.useState<Lead | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Bin is empty"
        description="Leads you mark as Lost or Spam land here."
      />
    );
  }

  const restore = (l: Lead) =>
    update.mutate(
      { id: l.id, patch: { stage: "new" } },
      {
        onSuccess: () => toast.success("Lead restored"),
        onError: (e) => toast.error(errMsg(e, "Couldn't restore")),
      },
    );

  const doDelete = () => {
    if (!confirm) return;
    del.mutate(confirm.id, {
      onSuccess: () => {
        toast.success("Lead deleted");
        setConfirm(null);
      },
      onError: (e) => toast.error(errMsg(e, "Couldn't delete")),
    });
  };

  return (
    <>
      <div className="divide-y rounded-xl border bg-card">
        {data.map((l) => {
          const meta = LEAD_STAGE_META[l.stage];
          return (
            <div key={l.id} className="flex items-center justify-between gap-3 p-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpen(l.id)}
              >
                <p className="truncate text-sm font-semibold">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.company || "No company"}
                </p>
              </button>
              <Badge
                variant="outline"
                className="shrink-0"
                style={{ borderColor: meta.color, color: meta.color }}
              >
                {meta.label}
              </Badge>
              {editable && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => restore(l)}
                    disabled={update.isPending}
                  >
                    <Undo2 className="size-3.5" /> Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirm(l)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lead permanently?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes {confirm?.name} for good and cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={doDelete}
              disabled={del.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed py-16 text-center">
      <Inbox className="size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New lead dialog
// ---------------------------------------------------------------------------

function NewLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const create = useCreateLead();
  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [service, setService] = React.useState("");
  const [budget, setBudget] = React.useState("");
  const [estValue, setEstValue] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [stage, setStage] = React.useState<LeadStage>("new");

  React.useEffect(() => {
    if (open) {
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setService("");
      setBudget("");
      setEstValue("");
      setMessage("");
      setStage("new");
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) return toast.error("Name is required.");
    const body: LeadInput = {
      name: name.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      service: service.trim() || null,
      budget: budget.trim() || null,
      estimatedValue: estValue ? toPaise(Number(estValue)) : null,
      message: message.trim() || null,
      stage,
    };
    create.mutate(body, {
      onSuccess: () => {
        toast.success("Lead created");
        onOpenChange(false);
      },
      onError: (e) => toast.error(errMsg(e, "Couldn't create lead")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Cooper"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as LeadStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_OPEN_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LEAD_STAGE_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Input value={service} onChange={(e) => setService(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Budget</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Estimated value (₹)</Label>
            <Input
              type="number"
              min={0}
              value={estValue}
              onChange={(e) => setEstValue(e.target.value)}
              placeholder="500000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
