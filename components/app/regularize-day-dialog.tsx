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
import { useRaiseRegularization } from "@/hooks/use-regularizations";
import { ApiError } from "@/lib/api/client";
import type { RegularizationType } from "@/lib/api/types";

const TYPE_OPTIONS: { value: RegularizationType; label: string }[] = [
  { value: "missed_punch", label: "Missed punch" },
  { value: "late", label: "Late arrival" },
  { value: "short_hours", label: "Short hours" },
  { value: "half_day", label: "Mark as half day" },
  { value: "wrong_status", label: "Wrong status" },
];

function combine(day: string, time: string): string | undefined {
  if (!time) return undefined;
  return new Date(`${day}T${time}:00`).toISOString();
}

export function RegularizeDayDialog({
  open,
  onOpenChange,
  day,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: string;
}) {
  const raise = useRaiseRegularization();
  const [type, setType] = React.useState<RegularizationType>("missed_punch");
  const [inTime, setInTime] = React.useState("");
  const [outTime, setOutTime] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setType("missed_punch");
      setInTime("");
      setOutTime("");
      setReason("");
    }
  }, [open]);

  const submit = () => {
    if (reason.trim().length < 3) return toast.error("Add a reason.");
    raise.mutate(
      {
        day,
        type,
        requestedCheckInAt: combine(day, inTime),
        requestedCheckOutAt: combine(day, outTime),
        requestedStatus: type === "half_day" ? "half_day" : undefined,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Regularization submitted");
          onOpenChange(false);
        },
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : "Couldn't submit"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Request regularization
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {day &&
                new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
            </span>
          </DialogTitle>
          <DialogDescription>
            Ask an admin to correct this day. Approved requests update your
            attendance record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Issue</Label>
            <Select value={type} onValueChange={(v) => setType(v as RegularizationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check-in time</Label>
              <Input
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out time</Label>
              <Input
                type="time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why does this day need correcting?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={raise.isPending}>
            {raise.isPending ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
