"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import type { PostType } from "@/lib/api/types";

export interface GenerateMonthInput {
  month: string; // YYYY-MM
  postsCount?: number;
  postTypes?: PostType[];
  platforms?: string[];
  useStoredStrategy?: boolean;
  tone?: string;
  audience?: string;
}

export interface GenerateMonthResult {
  generationId: string;
  clientId: string;
  month: string;
  model: string;
  status: string;
  postsCreated: number;
}

/** POST /clients/:clientId/ai/generate-month */
export function useGenerateMonth(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateMonthInput) =>
      api<GenerateMonthResult>(`/clients/${clientId}/ai/generate-month`, {
        method: "POST",
        body: {
          month: input.month,
          postsCount: input.postsCount ?? 12,
          postTypes: input.postTypes ?? ["post", "reel", "carousel"],
          platforms: input.platforms ?? ["instagram"],
          useStoredStrategy: input.useStoredStrategy ?? true,
          tone: input.tone,
          audience: input.audience,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Generated ${res.postsCreated} draft posts`);
      qc.invalidateQueries({ queryKey: ["clients", clientId, "posts"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.code === "NOT_IMPLEMENTED"
            ? "AI generation isn't configured on the server yet."
            : err.message
          : "AI generation failed";
      toast.error(msg);
    },
  });
}
