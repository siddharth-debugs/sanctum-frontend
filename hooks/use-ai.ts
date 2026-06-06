"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  PostType,
  AiDocType,
  AiMessage,
  AiGeneratedDocument,
  AiChatResponse,
  AiTaskBreakdownResult,
} from "@/lib/api/types";

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

// ---------------------------------------------------------------------------
// AI Assistant hub — document generator + chat.
// ---------------------------------------------------------------------------

/** Normalize an unknown error into a user-facing AI message. */
function aiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.code === "NOT_IMPLEMENTED"
      ? "AI isn't configured on the server yet."
      : err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export interface GenerateDocumentInput {
  type: AiDocType;
  /** Optional title hint; the model may refine it. */
  title?: string;
  /** Required context / brief describing what to write. */
  context: string;
}

/** POST /ai/generate-document → a titled markdown document. */
export function useGenerateDocument() {
  return useMutation({
    mutationFn: (input: GenerateDocumentInput) =>
      api<AiGeneratedDocument>("/ai/generate-document", {
        method: "POST",
        body: {
          type: input.type,
          title: input.title?.trim() || undefined,
          context: input.context,
        },
      }),
    onError: (err) =>
      toast.error(aiErrorMessage(err, "Couldn't generate the document.")),
  });
}

export interface AiChatInput {
  /** Full running conversation (the latest user turn included). */
  messages: AiMessage[];
  /** Optional project to ground the answer. */
  projectId?: string;
}

/** POST /ai/chat → the assistant's markdown reply. */
export function useAiChat() {
  return useMutation({
    mutationFn: (input: AiChatInput) =>
      api<AiChatResponse>("/ai/chat", {
        method: "POST",
        body: {
          messages: input.messages,
          projectId: input.projectId || undefined,
        },
      }),
  });
}

export interface GenerateBreakdownInput {
  projectId: string;
  /** Optional steering prompt for the breakdown. */
  prompt?: string;
}

/**
 * POST /ai/task-breakdown — server-side generates + PERSISTS a milestone/task
 * plan. We invalidate the project's tasks + milestones so the board refetches
 * the freshly written rows, and toast whether it came from the model or the
 * heuristic fallback.
 */
export function useGenerateBreakdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateBreakdownInput) =>
      api<AiTaskBreakdownResult>("/ai/task-breakdown", {
        method: "POST",
        body: {
          projectId: input.projectId,
          prompt: input.prompt?.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.projectTasks(res.projectId) });
      qc.invalidateQueries({
        queryKey: queryKeys.projectMilestones(res.projectId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.project(res.projectId) });
      qc.invalidateQueries({ queryKey: ["projects"] });
      const tasks = res.milestones.reduce((n, m) => n + m.tasks.length, 0);
      toast.success(
        `Generated ${res.milestones.length} milestones · ${tasks} tasks`,
        {
          description:
            res.source === "gemini"
              ? "Drafted with Gemini."
              : "Drafted with a built-in template (AI unavailable).",
        },
      );
    },
    onError: (err) =>
      toast.error(aiErrorMessage(err, "Couldn't generate the breakdown.")),
  });
}
