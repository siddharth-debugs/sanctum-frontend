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
  /** Optional client to ground the answer. */
  clientId?: string;
}

/**
 * POST /ai/chat response. Extends the shared shape with an optional `source`
 * flag (defined locally so we don't touch lib/api/types.ts) so the chat UI can
 * surface a gentle template-fallback note when no API key is configured.
 */
export interface AiChatResult extends AiChatResponse {
  source?: AiSource;
}

/** POST /ai/chat → the assistant's markdown reply. */
export function useAiChat() {
  return useMutation({
    mutationFn: (input: AiChatInput) =>
      api<AiChatResult>("/ai/chat", {
        method: "POST",
        body: {
          messages: input.messages,
          projectId: input.projectId || undefined,
          clientId: input.clientId || undefined,
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

// ---------------------------------------------------------------------------
// Social-content AI helpers — captions, hashtags, content ideas, repurpose.
// Types are defined LOCALLY here (we intentionally do NOT touch lib/api/types.ts).
// Each backend endpoint degrades to deterministic templates when no API key is
// configured, returning `source: "fallback"` so the UI can surface a gentle
// "running offline templates" note instead of an error.
// ---------------------------------------------------------------------------

export type AiSource = "gemini" | "fallback";

export interface CaptionsInput {
  /** A brief/topic, or an existing caption when `rewrite` is true. */
  brief: string;
  platform: string;
  tone?: string;
  rewrite?: boolean;
  clientId?: string;
  variations?: number;
}

export interface CaptionsResult {
  variations: string[];
  source: AiSource;
}

/** POST /ai/captions → 3-5 caption variations. */
export function useGenerateCaptions() {
  return useMutation({
    mutationFn: (input: CaptionsInput) =>
      api<CaptionsResult>("/ai/captions", {
        method: "POST",
        body: {
          brief: input.brief,
          platform: input.platform,
          tone: input.tone || undefined,
          rewrite: input.rewrite ?? false,
          clientId: input.clientId || undefined,
          variations: input.variations,
        },
      }),
    onError: (err) =>
      toast.error(aiErrorMessage(err, "Couldn't generate captions.")),
  });
}

export interface HashtagGroups {
  broad: string[];
  niche: string[];
  branded: string[];
}

export interface HashtagsInput {
  topic: string;
  platform: string;
  clientId?: string;
}

export interface HashtagsResult {
  groups: HashtagGroups;
  source: AiSource;
}

/** POST /ai/hashtags → grouped hashtag suggestions (broad / niche / branded). */
export function useGenerateHashtags() {
  return useMutation({
    mutationFn: (input: HashtagsInput) =>
      api<HashtagsResult>("/ai/hashtags", {
        method: "POST",
        body: {
          topic: input.topic,
          platform: input.platform,
          clientId: input.clientId || undefined,
        },
      }),
    onError: (err) =>
      toast.error(aiErrorMessage(err, "Couldn't suggest hashtags.")),
  });
}

export interface ContentIdea {
  hook: string;
  format: string;
  rationale: string;
}

export interface ContentIdeasInput {
  niche: string;
  count?: number;
  platform?: string;
  audience?: string;
  clientId?: string;
}

export interface ContentIdeasResult {
  ideas: ContentIdea[];
  source: AiSource;
}

/** POST /ai/content-ideas → a list of post ideas (hook + format + rationale). */
export function useGenerateContentIdeas() {
  return useMutation({
    mutationFn: (input: ContentIdeasInput) =>
      api<ContentIdeasResult>("/ai/content-ideas", {
        method: "POST",
        body: {
          niche: input.niche,
          count: input.count,
          platform: input.platform || undefined,
          audience: input.audience || undefined,
          clientId: input.clientId || undefined,
        },
      }),
    onError: (err) =>
      toast.error(aiErrorMessage(err, "Couldn't brainstorm ideas.")),
  });
}

export type RepurposeTarget =
  | "instagram"
  | "linkedin"
  | "x_thread"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "newsletter";

export interface RepurposeInput {
  content: string;
  target: RepurposeTarget;
  tone?: string;
  clientId?: string;
}

export interface RepurposeResult {
  /** Markdown-formatted adapted content. */
  content: string;
  targetLabel: string;
  source: AiSource;
}

/** POST /ai/repurpose → content adapted for another platform. */
export function useRepurposeContent() {
  return useMutation({
    mutationFn: (input: RepurposeInput) =>
      api<RepurposeResult>("/ai/repurpose", {
        method: "POST",
        body: {
          content: input.content,
          target: input.target,
          tone: input.tone || undefined,
          clientId: input.clientId || undefined,
        },
      }),
    onError: (err) =>
      toast.error(aiErrorMessage(err, "Couldn't repurpose the content.")),
  });
}
