import { apiRequest } from "./client";
import type { PortalData, PostComment } from "./types";

/**
 * Token-scoped portal client. The opaque token resolves to EXACTLY one
 * { agency, client } on the backend; no clientId is ever sent from here.
 */
export const portalApi = {
  /** GET /portal/resolve */
  async resolve(token: string): Promise<PortalData> {
    const res = await apiRequest<PortalData>("/portal/resolve", {
      portalToken: token,
    });
    return res.data;
  },

  /** POST /portal/posts/:postId/decision — body is { decision, note?, actorLabel? }. */
  async decide(
    token: string,
    postId: string,
    decision: "approved" | "changes_requested",
    note?: string,
    actorLabel?: string,
  ) {
    const res = await apiRequest<{
      postId: string;
      decision: string;
      newStatus: string;
      note: string | null;
      actorLabel: string | null;
      decidedAt: string;
    }>(`/portal/posts/${postId}/decision`, {
      method: "POST",
      portalToken: token,
      body: { decision, note, actorLabel },
    });
    return res.data;
  },

  /** POST /portal/posts/:postId/comments — backend field is `body`. */
  async comment(token: string, postId: string, body: string, actorLabel?: string) {
    const res = await apiRequest<PostComment>(
      `/portal/posts/${postId}/comments`,
      {
        method: "POST",
        portalToken: token,
        body: { body, actorLabel },
      },
    );
    return res.data;
  },

  /** GET /portal/posts/:postId/comments */
  async comments(token: string, postId: string) {
    const res = await apiRequest<PostComment[]>(
      `/portal/posts/${postId}/comments`,
      { portalToken: token },
    );
    return res.data;
  },
};
