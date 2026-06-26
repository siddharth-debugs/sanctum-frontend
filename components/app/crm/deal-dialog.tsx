"use client";

import * as React from "react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDeal,
  useUpdateDeal,
  type DealInput,
} from "@/hooks/use-crm";
import { useTeam } from "@/hooks/use-team";
import { DEAL_STAGES } from "@/lib/constants/crm-options";
import { toPaise, fromPaise } from "@/lib/money";
import { ApiError } from "@/lib/api/client";
import type { Deal, DealStage } from "@/lib/api/types";

const UNASSIGNED = "__none__";

export function DealDialog({
  open,
  onOpenChange,
  clientId,
  deal,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Required to CREATE; for edit we use deal.clientId. */
  clientId?: string;
  deal?: Deal | null;
}) {
  const isEdit = !!deal;
  const targetClient = deal?.clientId ?? clientId ?? "";
  const create = useCreateDeal(targetClient);
  const update = useUpdateDeal(targetClient);
  const { data: team } = useTeam();

  const [title, setTitle] = React.useState("");
  const [stage, setStage] = React.useState<DealStage>("lead");
  const [value, setValue] = React.useState("");
  const [probability, setProbability] = React.useState("");
  const [closeAt, setCloseAt] = React.useState("");
  const [ownerId, setOwnerId] = React.useState(UNASSIGNED);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setTitle(deal?.title ?? "");
      setStage(deal?.stage ?? "lead");
      setValue(deal ? String(fromPaise(deal.valuePaise)) : "");
      setProbability(deal ? String(deal.probability) : "");
      setCloseAt(deal?.expectedCloseAt ? deal.expectedCloseAt.slice(0, 10) : "");
      setOwnerId(deal?.ownerId ?? UNASSIGNED);
      setNotes(deal?.notes ?? "");
    }
  }, [open, deal]);

  const save = () => {
    if (!title.trim()) return toast.error("Title is required.");
    const body: DealInput = {
      title: title.trim(),
      stage,
      valuePaise: value ? toPaise(Number(value)) : 0,
      probability: probability ? Number(probability) : 0,
      expectedCloseAt: closeAt ? new Date(closeAt).toISOString() : null,
      ownerId: ownerId === UNASSIGNED ? null : ownerId,
      notes: notes.trim() || null,
    };
    const onDone = () => {
      toast.success(isEdit ? "Deal updated" : "Deal created");
      onOpenChange(false);
    };
    const onErr = (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't save");
    if (isEdit) update.mutate({ id: deal!.id, ...body }, { onSuccess: onDone, onError: onErr });
    else create.mutate(body, { onSuccess: onDone, onError: onErr });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit deal" : "New deal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q3 Retainer renewal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value (₹)</Label>
              <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="500000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Probability (%)</Label>
              <Input type="number" min={0} max={100} value={probability} onChange={(e) => setProbability(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected close</Label>
              <Input type="date" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {(team ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.fullName ?? m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={create.isPending || update.isPending}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
