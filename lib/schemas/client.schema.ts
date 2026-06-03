import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  contactEmail: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  brandColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Use a hex color like #1F8FD6")
    .optional()
    .or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
  facebook: z.string().optional().or(z.literal("")),
  linkedin: z.string().optional().or(z.literal("")),
  portalVisible: z.boolean(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
