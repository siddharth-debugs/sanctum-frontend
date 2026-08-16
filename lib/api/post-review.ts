/**
 * Transport-agnostic contract for the post review experience (approve / request
 * changes / discuss). The presentational review components — PortalFeedItem and
 * PortalComments — talk ONLY to this adapter, so the same UI can be driven by
 * either the (retired) token portal or the logged-in `/client/**` endpoints.
 */

/** One comment on a post, normalized across every review surface. */
export interface PortalComment {
  id: string;
  /** Display name — the client's own name, or the agency brand. */
  author: string;
  /** Who wrote it: an agency `user` or the `client`. */
  authorType: "user" | "client";
  body: string;
  createdAt: string;
}

/**
 * The API surface a review UI needs. An adapter wires these to a concrete
 * transport and owns its own React Query cache namespace via `queryKey`
 * (per-thread) and `invalidateKey` (the broad namespace to refetch after a
 * decision or new comment).
 */
export interface PostReviewApi {
  /** GET the thread for one post. */
  listComments(postId: string): Promise<PortalComment[]>;
  /** POST a new comment (the author is attached server-side). */
  addComment(postId: string, body: string): Promise<unknown>;
  /** POST an approve / request-changes decision. */
  decide(
    postId: string,
    decision: "approved" | "changes_requested",
    note?: string,
  ): Promise<unknown>;
  /** React Query key for a single post's thread (cache namespace). */
  queryKey: (postId: string) => readonly unknown[];
  /** Broad key to invalidate after any mutation (e.g. ["client-portal"]). */
  invalidateKey: readonly unknown[];
}
