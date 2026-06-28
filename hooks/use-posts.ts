"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  Post,
  PostApproval,
  PostComment,
  PostStatus,
  PostType,
} from "@/lib/api/types";

/** GET /clients/:clientId/posts?month=YYYY-MM&status=a,b&type=reel */
export function usePosts(
  clientId: string,
  filters?: { month?: string; status?: string; type?: string },
) {
  return useQuery({
    queryKey: queryKeys.posts(clientId, filters),
    queryFn: () =>
      api<Post[]>(`/clients/${clientId}/posts`, { query: filters }),
    enabled: !!clientId,
  });
}

/** GET /clients/:clientId/posts/:postId — detail (includes media). */
export function usePost(clientId: string, postId: string) {
  return useQuery({
    queryKey: queryKeys.post(clientId, postId),
    queryFn: () => api<Post>(`/clients/${clientId}/posts/${postId}`),
    enabled: !!clientId && !!postId,
  });
}

/** Request body for POST /clients/:clientId/posts. */
export interface PostInput {
  postType: PostType;
  caption?: string;
  platforms: string[];
  scheduledAt?: string;
  /** Backend create accepts only 'draft' | 'scheduled'. */
  status?: "draft" | "scheduled";
}

export function useCreatePost(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PostInput) =>
      api<Post>(`/clients/${clientId}/posts`, { method: "POST", body: input }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["clients", clientId, "posts"] }),
  });
}

/** PATCH body — caption/scheduledAt are nullable. */
export interface PostPatch {
  postType?: PostType;
  caption?: string | null;
  platforms?: string[];
  scheduledAt?: string | null;
}

export function useUpdatePost(clientId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PostPatch) =>
      api<Post>(`/clients/${clientId}/posts/${postId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["clients", clientId, "posts"] }),
  });
}

/** POST /clients/:clientId/posts/:postId/transition — body is { to }. */
export function useTransitionPost(clientId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (to: PostStatus) =>
      api<Post>(`/clients/${clientId}/posts/${postId}/transition`, {
        method: "POST",
        body: { to },
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["clients", clientId, "posts"] }),
  });
}

/** GET .../comments — client + staff comments on a post. */
export function usePostComments(clientId: string, postId?: string) {
  return useQuery({
    queryKey: queryKeys.postComments(clientId, postId ?? ""),
    queryFn: () =>
      api<PostComment[]>(`/clients/${clientId}/posts/${postId}/comments`),
    enabled: !!clientId && !!postId,
  });
}

/** GET .../approvals — client approval / change-request history on a post. */
export function usePostApprovals(clientId: string, postId?: string) {
  return useQuery({
    queryKey: queryKeys.postApprovals(clientId, postId ?? ""),
    queryFn: () =>
      api<PostApproval[]>(`/clients/${clientId}/posts/${postId}/approvals`),
    enabled: !!clientId && !!postId,
  });
}

/** POST .../comments — staff reply on a post. */
export function useAddPostComment(clientId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api<PostComment>(`/clients/${clientId}/posts/${postId}/comments`, {
        method: "POST",
        body: { body },
      }),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.postComments(clientId, postId),
      }),
  });
}
