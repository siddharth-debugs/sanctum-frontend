"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  Trash2,
  Undo2,
  Phone,
  StickyNote,
  CalendarClock,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useLead,
  useUpdateLead,
  useConvertLead,
  useDeleteLead,
  useAddLeadActivity,
  useUpdateLeadActivity,
  useDeleteLeadActivity,
  type LeadActivityInput,
} from "@/hooks/use-leads";
import { useTeam } from "@/hooks/use-team";
import { LEAD_STAGES, LEAD_STAGE_META } from "@/lib/constants/crm-options";
import { toPaise, fromPaise, formatINR } from "@/lib/money";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import type { Lead, LeadActivity, LeadStage } from "@/lib/api/types";

const UNASSIGNED = "__none__";
const errMsg = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

const ACT_ICON: Record<string, React.ElementType> = {
  note: StickyNote,
  call: Phone,
  meeting: CalendarClock,
  email: StickyNote,
  follow_up: CalendarClock,
  stage_change: ArrowRightLeft,
};

export function LeadDetailSheet({
  leadId,
  open,
  onOpenChange,
  editable,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editable: boolean;
}) {
  const { data: lead, isLoading } = useLead(open && leadId ? leadId : "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {isLoading || !lead ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <LeadDetailBody
            key={lead.id}
            lead={lead}
            editable={editable}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function LeadDetailBody({
  lead,
  editable,
  onClose,
}: {
  lead: Lead & { activities: LeadActivity[] };
  editable: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { data: team } = useTeam();
  const update = useUpdateLead();
  const convert = useConvertLead();
  const del = useDeleteLead();

  const inBin = lead.stage === "lost" || lead.stage === "spam";
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // ---- Editable profile fields (local state, saved as a patch) ----
  const [company, setCompany] = React.useState(lead.company ?? "");
  const [email, setEmail] = React.useState(lead.email ?? "");
  const [phone, setPhone] = React.useState(lead.phone ?? "");
  const [service, setService] = React.useState(lead.service ?? "");
  const [budget, setBudget] = React.useState(lead.budget ?? "");
  const [estValue, setEstValue] = React.useState(
    lead.estimatedValue != null ? String(fromPaise(lead.estimatedValue)) : "",
  );
  const [message, setMessage] = React.useState(lead.message ?? "");
  const [ownerId, setOwnerId] = React.useState(lead.ownerId ?? UNASSIGNED);

  const setStage = (stage: LeadStage) => {
    update.mutate(
      { id: lead.id, patch: { stage } },
      {
        onSuccess: () => toast.success(`Moved to ${LEAD_STAGE_META[stage].label}`),
        onError: (e) => toast.error(errMsg(e, "Couldn't update stage")),
      },
    );
  };

  const saveProfile = () => {
    update.mutate(
      {
        id: lead.id,
        patch: {
          company: company.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          service: service.trim() || null,
          budget: budget.trim() || null,
          estimatedValue: estValue ? toPaise(Number(estValue)) : null,
          message: message.trim() || null,
          ownerId: ownerId === UNASSIGNED ? null : ownerId,
        },
      },
      {
        onSuccess: () => toast.success("Lead updated"),
        onError: (e) => toast.error(errMsg(e, "Couldn't save changes")),
      },
    );
  };

  const doConvert = () => {
    convert.mutate(
      { id: lead.id },
      {
        onSuccess: (res) => {
          toast.success("Lead converted to client");
          onClose();
          router.push(`/clients/${res.clientId}`);
        },
        onError: (e) => toast.error(errMsg(e, "Couldn't convert lead")),
      },
    );
  };

  const doDelete = () => {
    del.mutate(lead.id, {
      onSuccess: () => {
        toast.success("Lead deleted");
        setConfirmDelete(false);
        onClose();
      },
      onError: (e) => toast.error(errMsg(e, "Couldn't delete lead")),
    });
  };

  const meta = LEAD_STAGE_META[lead.stage];

  return (
    <>
      <SheetHeader className="border-b p-4">
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">{lead.name}</SheetTitle>
            <SheetDescription className="truncate">
              {lead.company || "No company"}
              {lead.source ? ` · via ${lead.source}` : ""}
            </SheetDescription>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 gap-1.5"
            style={{ borderColor: meta.color, color: meta.color }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: meta.color }}
            />
            {meta.label}
          </Badge>
        </div>

        {editable && (
          <div className="mt-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Stage</Label>
            <Select
              value={lead.stage}
              onValueChange={(v) => setStage(v as LeadStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STAGE_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {lead.convertedClientId && (
          <p className="mt-1 text-xs text-muted-foreground">
            Converted to{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => {
                onClose();
                router.push(`/clients/${lead.convertedClientId}`);
              }}
            >
              {lead.convertedClientName || "client"}
            </button>
          </p>
        )}
      </SheetHeader>

      <div className="space-y-6 p-4">
        {/* ---- Editable details ---- */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company">
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={!editable}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!editable}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!editable}
              />
            </Field>
            <Field label="Service">
              <Input
                value={service}
                onChange={(e) => setService(e.target.value)}
                disabled={!editable}
              />
            </Field>
            <Field label="Budget">
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                disabled={!editable}
              />
            </Field>
            <Field label="Est. value (₹)">
              <Input
                type="number"
                min={0}
                value={estValue}
                onChange={(e) => setEstValue(e.target.value)}
                disabled={!editable}
              />
            </Field>
          </div>
          <Field label="Owner">
            <Select
              value={ownerId}
              onValueChange={setOwnerId}
              disabled={!editable}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {(team ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Message">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              disabled={!editable}
            />
          </Field>
          {editable && (
            <Button
              size="sm"
              onClick={saveProfile}
              disabled={update.isPending}
            >
              Save changes
            </Button>
          )}
        </section>

        {/* ---- Activity timeline ---- */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Activity</h3>
          {editable && <ActivityComposer leadId={lead.id} />}
          <ActivityTimeline
            leadId={lead.id}
            activities={lead.activities}
            editable={editable}
          />
        </section>
      </div>

      {/* ---- Action bar ---- */}
      {editable && (
        <div className="sticky bottom-0 mt-auto flex flex-wrap gap-2 border-t bg-background/95 p-4 backdrop-blur">
          {inBin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStage("new")}
                disabled={update.isPending}
              >
                <Undo2 className="size-4" /> Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </>
          ) : (
            <>
              {lead.stage !== "converted" && (
                <Button
                  size="sm"
                  onClick={doConvert}
                  disabled={convert.isPending}
                >
                  <ArrowRightLeft className="size-4" /> Convert to client
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStage("lost")}
                disabled={update.isPending}
              >
                <Ban className="size-4" /> Mark Lost
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStage("spam")}
                disabled={update.isPending}
              >
                <Ban className="size-4" /> Mark Spam
              </Button>
            </>
          )}
        </div>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lead permanently?</DialogTitle>
            <DialogDescription>
              This removes {lead.name} and its activity for good. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const COMPOSER_TYPES: { value: LeadActivityInput["type"]; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "follow_up", label: "Follow-up" },
];

function ActivityComposer({ leadId }: { leadId: string }) {
  const add = useAddLeadActivity();
  const [type, setType] =
    React.useState<LeadActivityInput["type"]>("note");
  const [body, setBody] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");

  const submit = () => {
    if (!body.trim()) return toast.error("Write something first.");
    const input: LeadActivityInput = { type, body: body.trim() };
    if (type === "follow_up") {
      if (!dueAt) return toast.error("Pick a due date for the follow-up.");
      input.dueAt = new Date(dueAt).toISOString();
    }
    add.mutate(
      { leadId, input },
      {
        onSuccess: () => {
          setBody("");
          setDueAt("");
          setType("note");
        },
        onError: (e) => toast.error(errMsg(e, "Couldn't add activity")),
      },
    );
  };

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex gap-1.5">
        {COMPOSER_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              type === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={
          type === "call"
            ? "What did you discuss?"
            : type === "follow_up"
              ? "What's the next step?"
              : "Add a note…"
        }
      />
      <div className="flex items-center justify-between gap-2">
        {type === "follow_up" ? (
          <Input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-auto"
          />
        ) : (
          <span />
        )}
        <Button size="sm" onClick={submit} disabled={add.isPending}>
          Add
        </Button>
      </div>
    </div>
  );
}

function ActivityTimeline({
  leadId,
  activities,
  editable,
}: {
  leadId: string;
  activities: LeadActivity[];
  editable: boolean;
}) {
  if (!activities || activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No activity yet. Log a call or note to start the timeline.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {activities.map((a) => (
        <ActivityRow
          key={a.id}
          leadId={leadId}
          activity={a}
          editable={editable}
        />
      ))}
    </ul>
  );
}

function ActivityRow({
  leadId,
  activity,
  editable,
}: {
  leadId: string;
  activity: LeadActivity;
  editable: boolean;
}) {
  const updateAct = useUpdateLeadActivity();
  const deleteAct = useDeleteLeadActivity();
  const Icon = ACT_ICON[activity.type] ?? StickyNote;

  const isFollowUp = activity.type === "follow_up";
  const done = !!activity.completedAt;
  const overdue =
    isFollowUp &&
    !done &&
    !!activity.dueAt &&
    new Date(activity.dueAt).getTime() < Date.now();

  const markDone = () =>
    updateAct.mutate(
      { leadId, actId: activity.id, patch: { done: true } },
      { onError: (e) => toast.error(errMsg(e, "Couldn't update")) },
    );

  const remove = () =>
    deleteAct.mutate(
      { leadId, actId: activity.id },
      { onError: (e) => toast.error(errMsg(e, "Couldn't delete")) },
    );

  return (
    <li className="rounded-lg border bg-card p-2.5">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md",
            overdue
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm whitespace-pre-wrap">{activity.body}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>{activity.authorName ?? "System"}</span>
            <span>·</span>
            <span>{formatDateTime(activity.createdAt)}</span>
            {isFollowUp && activity.dueAt && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  done
                    ? "text-success"
                    : overdue
                      ? "text-destructive"
                      : "text-primary",
                )}
              >
                {overdue && <AlertCircle className="size-3" />}
                {done ? (
                  <>
                    <CheckCircle2 className="size-3" /> Done
                  </>
                ) : (
                  <>Due {formatDate(activity.dueAt)}</>
                )}
              </span>
            )}
          </div>
        </div>
        {editable && activity.type !== "stage_change" && (
          <div className="flex shrink-0 items-center gap-0.5">
            {isFollowUp && !done && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-success"
                title="Mark done"
                onClick={markDone}
                disabled={updateAct.isPending}
              >
                <CheckCircle2 className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              title="Delete"
              onClick={remove}
              disabled={deleteAct.isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
