/**
 * DTOs mirroring the Express API contract EXACTLY (backend/src/routes/*.ts).
 * Success responses are wrapped as { data, pagination?, meta? }; errors as
 * { error: { code, message, details?, requestId? } }.
 */

export type Role = "owner" | "admin" | "member";

export type PostType = "reel" | "story" | "carousel" | "post";

/** Platforms are free-form strings on the backend; these are the seeded ones. */
export type Platform =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "x"
  | "youtube";

export type PostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "changes_requested"
  | "scheduled"
  | "posted";

export type ClientStatus = "active" | "archived";

export type UserStatus = "active" | "disabled";

export type PlanId = "studio" | "agency" | "partner" | "empire";

export interface ApiEnvelope<T> {
  data: T;
  pagination?: Pagination;
  meta?: Record<string, unknown>;
}

export interface Pagination {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

/** GET /agency (and the agency object embedded in /auth/me). */
export interface Agency {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  status?: AgencyStatus;
}

export type AgencyStatus = "active" | "suspended" | "deleted";

/** Plan summary embedded in /auth/me. */
export interface PlanSummary {
  id: PlanId | string;
  name: string;
  maxClients: number | null;
  maxAiGenerations: number | null;
}

/** Auth-context user as returned by /auth/me and /auth/login. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
}

/** GET /auth/me payload. */
export interface MeResponse {
  user: AuthUser;
  agency: Agency | null;
  plan: PlanSummary | null;
}

/** POST /auth/login payload. */
export interface LoginResponse {
  user: AuthUser;
  agencyId: string;
}

/** POST /auth/signup payload. */
export interface SignupResponse {
  user: { id: string; email: string; fullName: string; role: Role };
  agency: { id: string; name: string; slug: string };
}

/** GET /team row. */
export interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
}

/** GET /clients row (and /clients/:id). */
export interface Client {
  id: string;
  name: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  /** Free-form social handles; backend may also fold a `sector` key in. */
  handles?: Record<string, string> | null;
  contactEmail?: string | null;
  status: ClientStatus;
  portalVisibleStatuses: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  cloudinaryPublicId?: string;
  secureUrl: string;
  resourceType: "image" | "video";
  format?: string | null;
  bytes?: number | null;
  width?: number | null;
  height?: number | null;
  position: number;
}

/** GET .../comments row (staff + portal). Backend field is `body`. */
export interface PostComment {
  id: string;
  body: string;
  authorType: "user" | "client";
  authorUserId?: string | null;
  authorLabel?: string | null;
  createdAt: string;
}

/** GET .../approvals row. */
export interface PostApproval {
  id: string;
  decision: "approved" | "changes_requested";
  note?: string | null;
  actorLabel?: string | null;
  createdAt: string;
}

/** Serialized content post (list + detail). No `title` on the backend. */
export interface Post {
  id: string;
  clientId: string;
  postType: PostType;
  caption: string | null;
  platforms: string[];
  scheduledAt: string | null;
  status: PostStatus;
  createdBy?: string | null;
  aiGenerationId?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present only on the detail endpoint and the portal payloads. */
  media?: MediaAsset[];
}

/** GET /analytics/summary payload (owner/admin). */
export interface AnalyticsSummary {
  clients: number;
  posts: number;
  postsByStatus: Partial<Record<PostStatus, number>>;
}

/** A single HTTP rate-limit window surfaced from the backend. */
export interface RateLimitWindow {
  max: number;
  windowMs: number;
}

/** GET /agency/usage payload (owner/admin). */
export interface AgencyUsage {
  period: string;
  planName: string | null;
  ai: {
    used: number;
    limit: number | null;
    provider: string;
    model: string;
  };
  storage: { usedBytes: number; limitBytes: number | null };
  clients: { used: number; limit: number | null };
  team: { used: number; limit: number | null };
  rateLimits: {
    global: RateLimitWindow;
    auth: RateLimitWindow;
    ai: RateLimitWindow;
  };
}

/** Portal share token (GET /clients/:id/portal-tokens). */
export interface PortalToken {
  id: string;
  label: string | null;
  revoked: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

/** POST /clients/:id/portal-tokens (raw token shown ONCE). */
export interface PortalTokenCreated {
  id: string;
  token: string;
  label: string | null;
  expiresAt: string | null;
}

/** Public portal payload (GET /portal/resolve; token-scoped). */
export interface PortalData {
  agency: { name: string; logoUrl?: string | null; brandColor?: string | null } | null;
  client: {
    id: string;
    name: string;
    logoUrl?: string | null;
    brandColor?: string | null;
    handles?: Record<string, string> | null;
  };
  portal: {
    visibleStatuses: string[];
    canApprove: boolean;
    canComment: boolean;
  };
  posts: PortalPost[];
}

export interface PortalPost {
  id: string;
  postType: PostType;
  caption: string | null;
  platforms: string[];
  scheduledAt: string | null;
  status: PostStatus;
  media: Array<{
    resourceType: "image" | "video";
    secureUrl: string;
    width?: number | null;
    height?: number | null;
    position: number;
  }>;
}
