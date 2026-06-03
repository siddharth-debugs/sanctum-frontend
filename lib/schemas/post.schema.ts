import { z } from "zod";

export const POST_TYPES = ["reel", "story", "carousel", "post"] as const;
export const PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "youtube",
] as const;

const mediaAssetSchema = z.object({
  publicId: z.string(),
  secureUrl: z.string(),
  bytes: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
  resourceType: z.enum(["image", "video"]),
});

export const postSchema = z.object({
  postType: z.enum(POST_TYPES),
  platforms: z.array(z.enum(PLATFORMS)).min(1, "Pick at least one platform"),
  scheduledAt: z.date({ message: "Pick a date" }),
  caption: z.string().max(2200, "Captions max out at 2200 characters"),
  media: z.array(mediaAssetSchema),
  sendForApproval: z.boolean(),
});

export type PostFormValues = z.infer<typeof postSchema>;
