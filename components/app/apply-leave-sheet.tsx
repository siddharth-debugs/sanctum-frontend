"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { useLeaveTypes, useApplyLeave } from "@/hooks/use-leaves";
import { ApiError } from "@/lib/api/client";

export function ApplyLeaveSheet({
  open,
  onOpenChange,
  defaultDay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDay?: string;
}) {
  const { data: types } = useLeaveTypes();
  const apply = useApplyLeave();
  const active = (types ?? []).filter((t) => t.active);

  const [leaveTypeId, setLeaveTypeId] = React.useState("");
  const [startDay, setStartDay] = React.useState(defaultDay ?? "");
  const [endDay, setEndDay] = React.useState(defaultDay ?? "");
  const [halfStart, setHalfStart] = React.useState(false);
  const [halfEnd, setHalfEnd] = React.useState(false);
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setLeaveTypeId(active[0]?.id ?? "");
      setStartDay(defaultDay ?? "");
      setEndDay(defaultDay ?? "");
      setHalfStart(false);
      setHalfEnd(false);
      setReason("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDay]);

  const submit = () => {
    if (!leaveTypeId) return toast.error("Pick a leave type.");
    if (!startDay || !endDay) return toast.error("Pick the dates.");
    apply.mutate(
      {
        leaveTypeId,
        startDay,
        endDay,
        halfDayStart: halfStart,
        halfDayEnd: halfEnd,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Leave request submitted");
          onOpenChange(false);
        },
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : "Couldn't apply"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>
            Submit a request for approval. Weekly-offs and holidays in the range
            aren&apos;t counted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Leave type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {active.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.annualQuota > 0 ? ` · ${t.annualQuota}/yr` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {active.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No leave types yet — an admin can add them in Settings →
                Attendance.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input
                type="date"
                value={startDay}
                onChange={(e) => {
                  setStartDay(e.target.value);
                  if (!endDay || endDay < e.target.value) setEndDay(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="date"
                value={endDay}
                min={startDay || undefined}
                onChange={(e) => setEndDay(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={halfStart} onCheckedChange={setHalfStart} />
              Half day on first day
            </label>
            {endDay !== startDay && (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={halfEnd} onCheckedChange={setHalfEnd} />
                Half day on last day
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Add context for your manager…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={apply.isPending}>
            {apply.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
