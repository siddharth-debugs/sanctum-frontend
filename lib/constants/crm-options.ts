import type { DealStage, ClientNoteType } from "@/lib/api/types";

/** Pipeline stages in order, with display metadata. */
export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "var(--muted-foreground)" },
  { value: "qualified", label: "Qualified", color: "#0ea5e9" },
  { value: "proposal", label: "Proposal", color: "var(--warning)" },
  { value: "negotiation", label: "Negotiation", color: "var(--accent)" },
  { value: "won", label: "Won", color: "var(--success)" },
  { value: "lost", label: "Lost", color: "var(--destructive)" },
];

export const DEAL_STAGE_META = DEAL_STAGES.reduce(
  (acc, s) => {
    acc[s.value] = { label: s.label, color: s.color };
    return acc;
  },
  {} as Record<DealStage, { label: string; color: string }>,
);

/** Open (non-closed) stages, for "pipeline value" math. */
export const OPEN_STAGES: DealStage[] = ["lead", "qualified", "proposal", "negotiation"];

export const NOTE_TYPE_META: Record<
  ClientNoteType,
  { label: string; color: string }
> = {
  note: { label: "Note", color: "var(--muted-foreground)" },
  call: { label: "Call", color: "var(--primary)" },
  meeting: { label: "Meeting", color: "var(--accent)" },
  email: { label: "Email", color: "#0ea5e9" },
  task: { label: "Task", color: "var(--warning)" },
};

export const NOTE_TYPES: ClientNoteType[] = ["note", "call", "meeting", "email", "task"];
