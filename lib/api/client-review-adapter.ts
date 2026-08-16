import { api } from "@/lib/api/client";
import type { PortalComment, PostReviewApi } from "@/lib/api/post-review";
import type { ClientPostComment } from "@/lib/api/types";

/**
 * Review adapter for the LOGGED-IN client portal. Drives the shared
 * PortalFeedItem / PortalComments UI against the Bearer-authed `/client/**`
 * endpoints. Unlike the old token portal, the client's identity comes from the
 * session — no `actorLabel` is ever sent; the server attaches the author.
 *
 * Its cache lives under the `["client-portal", …]` namespace so a logout's
 * `queryClient.clear()` wipes it and comment threads stay isolated per post.
 */
export const clientReviewApi: PostReviewApi = {
  listComments: (postId): Promise<PortalComment[]> =>
    api<ClientPostComment[]>(`/client/posts/${postId}/comments`),

  addComment: (postId, body) =>
    api<ClientPostComment>(`/client/posts/${postId}/comments`, {
      method: "POST",
      body: { body },
    }),

  decide: (postId, decision, note) =>
    api<{ postId: string; decision: string; newStatus: string }>(
      `/client/posts/${postId}/decision`,
      { method: "POST", body: { decision, note } },
    ),

  queryKey: (postId) => ["client-portal", "comments", postId] as const,
  invalidateKey: ["client-portal"] as const,
};
