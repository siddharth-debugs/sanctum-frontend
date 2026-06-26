import { z } from "zod";

/** Dial codes offered for the phone field; first is the default (+91). */
export const PHONE_CC_VALUES = [
  "+91",
  "+1",
  "+44",
  "+61",
  "+971",
  "+65",
] as const;

export const CLIENT_SOURCE_VALUES = [
  "referral",
  "inbound",
  "outbound",
  "social",
  "event",
  "agency_network",
  "other",
] as const;

export const RELATIONSHIP_HEALTH_VALUES = [
  "excellent",
  "good",
  "at_risk",
  "poor",
] as const;

export const clientSchema = z.object({
  // COMPANY INFO
  name: z.string().min(2, "Name is too short").max(80),
  industry: z.string().optional().or(z.literal("")),
  website: z
    .string()
    .url("Enter a valid URL like https://example.com")
    .optional()
    .or(z.literal("")),
  phoneCc: z.enum(PHONE_CC_VALUES).optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
  contactEmail: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  clientSource: z.enum(CLIENT_SOURCE_VALUES).optional().or(z.literal("")),

  // BILLING
  gstNumber: z.string().max(20).optional().or(z.literal("")),
  paymentTermsDays: z.number().int().min(0).optional(),
  billingAddress: z.string().max(400).optional().or(z.literal("")),
  billingState: z.string().optional().or(z.literal("")),
  billingCity: z.string().max(80).optional().or(z.literal("")),
  billingPincode: z.string().max(12).optional().or(z.literal("")),

  // STATUS
  relationshipHealth: z
    .enum(RELATIONSHIP_HEALTH_VALUES)
    .optional()
    .or(z.literal("")),
  nextFollowUpAt: z.date().optional(),
  active: z.boolean(),
  /** Post statuses the client portal exposes (checkboxes). */
  portalVisibleStatuses: z.array(z.string()),
  internalNotes: z.string().max(2000).optional().or(z.literal("")),

  // BRANDING + HANDLES
  brandColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Use a hex color like #1F8FD6")
    .optional()
    .or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
  facebook: z.string().optional().or(z.literal("")),
  linkedin: z.string().optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
