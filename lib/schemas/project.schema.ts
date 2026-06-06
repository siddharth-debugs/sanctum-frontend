import { z } from "zod";

export const PROJECT_TYPE_VALUES = [
  "fixed_price",
  "retainer",
  "hourly",
  "milestone_based",
] as const;

export const PROJECT_STATUS_VALUES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const PROJECT_HEALTH_VALUES = [
  "on_track",
  "at_risk",
  "off_track",
] as const;

export const projectSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  clientId: z.string().min(1, "Pick a client"),
  type: z.enum(PROJECT_TYPE_VALUES),
  status: z.enum(PROJECT_STATUS_VALUES),
  health: z.enum(PROJECT_HEALTH_VALUES),
  contractValue: z.number().min(0).optional(),
  startDate: z.date().optional(),
  deadline: z.date().optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
