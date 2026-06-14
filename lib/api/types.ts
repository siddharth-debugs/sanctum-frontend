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

export type ClientSource =
  | "referral"
  | "inbound"
  | "outbound"
  | "social"
  | "event"
  | "agency_network"
  | "other";

export type RelationshipHealth = "excellent" | "good" | "at_risk" | "poor";

export type UserStatus = "active" | "disabled";

export type PlanId = "studio" | "agency" | "partner" | "empire";

export type ProjectType =
  | "fixed_price"
  | "retainer"
  | "hourly"
  | "milestone_based";

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectHealth = "on_track" | "at_risk" | "off_track";

export type ProjectTaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";

export type ProjectMilestoneStatus = "pending" | "completed";

/** Task priority — semantic order: none < low < medium < high < urgent. */
export type ProjectTaskPriority =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "urgent";

/** Allowed label palette tokens (mirrors backend LABEL_COLORS). */
export type ProjectLabelColor =
  | "pine"
  | "brass"
  | "sky"
  | "rose"
  | "amber"
  | "violet"
  | "slate";

// ---------------------------------------------------------------------------
// Finance — ALL money fields are INTEGER PAISE (₹1 = 100 paise). Format with
// lib/money.ts formatINR(); never render these as plain numbers.
// ---------------------------------------------------------------------------

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type ExpenseCategory =
  | "software"
  | "salaries"
  | "marketing"
  | "travel"
  | "office"
  | "equipment"
  | "contractor"
  | "taxes"
  | "utilities"
  | "other";

/** A single invoice line item (paise fields starred in the contract). */
export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unit: string;
  /** paise */
  rate: number;
  gstRate: number;
  /** paise */
  amount: number;
  position: number;
  createdAt: string;
}

/** A payment recorded against an invoice. */
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  /** paise */
  amount: number;
  paidAt: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
}

/** GET /invoices row. Detail (GET /invoices/:id) adds `items` + `payments`. */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  status: InvoiceStatus;
  baseStatus: InvoiceStatus;
  issueDate: string | null;
  dueDate: string | null;
  isInterstate: 0 | 1;
  currency: "INR" | string;
  /** paise */
  subtotal: number;
  /** paise */
  taxTotal: number;
  /** paise */
  cgst: number;
  /** paise */
  sgst: number;
  /** paise */
  igst: number;
  /** paise */
  total: number;
  /** paise */
  amountPaid: number;
  /** paise */
  amountDue: number;
  notes: string | null;
  terms: string | null;
  bankDetails: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  /** Detail-only. */
  items?: InvoiceItem[];
  /** Detail-only. */
  payments?: InvoicePayment[];
}

/** GET /expenses row. */
export interface Expense {
  id: string;
  category: ExpenseCategory;
  /** paise */
  amount: number;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  expenseDate: string;
  receiptUrl: string | null;
  gstDeductible: 0 | 1;
  /** paise | null */
  gstAmount: number | null;
  loggedBy: string | null;
  loggedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /finance/overview payload. All amount fields are paise. */
export interface FinanceOverview {
  range: { from: string; to: string };
  /** paise */
  totalRevenue: number;
  /** paise */
  collected: number;
  /** paise */
  outstanding: number;
  /** paise */
  expenses: number;
  /** paise */
  netProfit: number;
  marginPct: number;
  pipeline: {
    overdue: { count: number; amount: number };
    dueThisWeek: { count: number; amount: number };
    dueThisMonth: { count: number; amount: number };
    paidThisMonth: { count: number; amount: number };
  };
  revenueByClient: Array<{ clientId: string; clientName: string; amount: number }>;
  expensesByCategory: Array<{ category: ExpenseCategory; amount: number }>;
}

// ---------------------------------------------------------------------------
// Sheets — a Google-Sheets-lite editor. `data` is an opaque JSON blob the
// frontend owns; the backend persists it verbatim.
// ---------------------------------------------------------------------------

/** How a cell's numeric value is rendered. */
export type NumberFormat = "general" | "number" | "currency" | "percent";

/** Per-cell style. All keys optional; absent means "inherit default". */
export interface CellStyle {
  /** bold */
  b?: boolean;
  /** italic */
  i?: boolean;
  /** underline */
  u?: boolean;
  /** horizontal alignment */
  a?: "left" | "center" | "right";
  /** text color (CSS color) */
  color?: string;
  /** fill / background color (CSS color) */
  bg?: string;
  /** number format */
  fmt?: NumberFormat;
}

/**
 * A single cell. `v` is a literal value; `f` is a formula (incl. the leading
 * "="). A cell may carry just a style with no value (formatting an empty cell).
 */
export interface SheetCell {
  v?: string | number;
  f?: string;
  s?: CellStyle;
}

/** The editable grid payload stored under `Sheet.data`. */
export interface SheetData {
  /** A1-keyed sparse map of cells ("A1", "B2", "AA10"). */
  cells: Record<string, SheetCell>;
  rows: number;
  cols: number;
}

/** GET /sheets row. */
export interface SheetSummary {
  id: string;
  title: string;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /sheets/:id — full sheet incl. its grid data. */
export interface Sheet {
  id: string;
  title: string;
  clientId: string | null;
  projectId: string | null;
  data: SheetData;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// AI Assistant — document generation + freeform chat (POST /ai/*). Responses
// come back as markdown the frontend renders via the themed <Markdown> wrapper.
// ---------------------------------------------------------------------------

/** Document kinds the generator can produce (drives the request only). */
export type AiDocType =
  | "sop"
  | "proposal"
  | "report"
  | "handover"
  | "process_guide"
  | "brief"
  | "email";

/** A single turn in an AI chat conversation. */
export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

/** POST /ai/generate-document → the generated document. */
export interface AiGeneratedDocument {
  title: string;
  /** Markdown body. */
  content: string;
}

/** POST /ai/chat → the assistant's next turn. */
export interface AiChatResponse {
  /** Markdown reply. */
  reply: string;
}

/**
 * POST /ai/task-breakdown → a freshly persisted milestone/task plan. The board
 * just refetches the project tasks + milestones after this resolves; this shape
 * is surfaced mainly to report the source (real model vs. heuristic fallback).
 */
export interface AiTaskBreakdownResult {
  projectId: string;
  source: "gemini" | "fallback";
  milestones: Array<{
    id: string;
    title: string;
    position: number;
    tasks: Array<{
      id: string;
      title: string;
      status: ProjectTaskStatus;
      position: number;
    }>;
  }>;
}

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

/** GET /team row (array). */
export interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  designation: string | null;
  department: string | null;
  phone: string | null;
  /** Hourly rate in integer PAISE (or null when unset). */
  hourlyRate: number | null;
  weeklyCapacityHrs: number;
  skills: string[];
  joinedAt: string;
  activeTaskCount: number;
  projectCount: number;
  loggedMinutesThisWeek: number;
  utilizationPct: number;
}

/** A single logged time entry for a member. */
export interface TimeLog {
  id: string;
  minutes: number;
  workDate: string;
  note: string | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
}

/** A project a member is attached to (folded into GET /team/:id). */
export interface TeamMemberProject {
  id: string;
  name: string;
  status: ProjectStatus;
  role?: string | null;
}

/** An active task assigned to a member (folded into GET /team/:id). */
export interface TeamMemberTask {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  projectId: string;
  projectName: string;
  dueDate: string | null;
}

/** GET /team/:id — member + folded rollups. */
export interface TeamMemberDetail extends TeamMember {
  projects: TeamMemberProject[];
  activeTasks: TeamMemberTask[];
  timeLogs: TimeLog[];
  totalLoggedMinutes: number;
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
  /** CRM: company profile. */
  industry?: string | null;
  website?: string | null;
  phoneCc?: string | null;
  phone?: string | null;
  clientSource?: ClientSource | null;
  /** CRM: billing. */
  gstNumber?: string | null;
  paymentTermsDays?: number | null;
  billingAddress?: string | null;
  billingState?: string | null;
  billingCity?: string | null;
  billingPincode?: string | null;
  /** CRM: relationship. */
  relationshipHealth?: RelationshipHealth | null;
  nextFollowUpAt?: string | null;
  internalNotes?: string | null;
  /** Present when the backend folds in a project rollup for this client. */
  projectCount?: number;
  /** Finance rollups folded in by GET /clients/:id. */
  invoiceCount?: number;
  /** Outstanding (unpaid) amount across this client's invoices, in paise. */
  outstanding?: number;
  /** Document rollup folded in by GET /clients/:id. */
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /projects row (and /projects/:id). */
export interface Project {
  id: string;
  agencyId: string;
  clientId: string;
  clientName: string;
  name: string;
  description?: string | null;
  type: ProjectType;
  status: ProjectStatus;
  health: ProjectHealth;
  contractValue: number;
  currency: "INR" | string;
  startDate: string | null;
  deadline: string | null;
  createdBy?: string | null;
  tasksTotal: number;
  tasksDone: number;
  milestonesTotal: number;
  milestonesDone: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A project-scoped task label definition. */
export interface ProjectLabel {
  id: string;
  projectId: string;
  name: string;
  color: ProjectLabelColor;
  createdAt: string;
}

/**
 * GET /projects/:id/tasks row. The flexible list endpoint enriches each row
 * with `labels` + the four computed counts; those are present on list/detail
 * responses and optional elsewhere (e.g. POST/PATCH return the bare task).
 */
export interface ProjectTask {
  id: string;
  projectId: string;
  /** Milestone this task belongs to, or null when unassigned (loose task). */
  milestoneId: string | null;
  title: string;
  description?: string | null;
  status: ProjectTaskStatus;
  assigneeId?: string | null;
  assigneeName?: string | null;
  /** Priority bucket; defaults to "none". */
  priority: ProjectTaskPriority;
  /** Time estimate in whole minutes, or null when unset. */
  estimateMinutes: number | null;
  /** Optional start date (pairs with dueDate). */
  startDate: string | null;
  dueDate: string | null;
  /** Stamped when status -> "done", cleared otherwise. */
  completedAt: string | null;
  /** Parent task id when this is a subtask (one level only); null otherwise. */
  parentTaskId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  // ---- Enriched (list + detail) ----
  labels?: ProjectLabel[];
  subtaskCount?: number;
  subtaskDoneCount?: number;
  blockedByCount?: number;
  commentCount?: number;
}

/** A single dependency edge resolved to the related task. */
export interface ProjectTaskDependencyEdge {
  /** The dependency row id (used to DELETE the edge). */
  depId: string;
  task: ProjectTask;
}

/** GET /projects/:id/tasks/:taskId/dependencies payload. */
export interface ProjectTaskDependencies {
  /** Tasks that block this one (must finish first). */
  blockedBy: ProjectTaskDependencyEdge[];
  /** Tasks this one blocks. */
  blocks: ProjectTaskDependencyEdge[];
}

/** Backwards/forwards alias for a single dependency edge. */
export type ProjectTaskDependency = ProjectTaskDependencyEdge;

/** GET .../comments row. `mentions` are resolved userIds. */
export interface ProjectTaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  /** Non-null on soft-deleted comments (normally filtered out server-side). */
  deletedAt: string | null;
}

/**
 * One entry in the merged task feed. `kind` discriminates whether to render the
 * audit activity or the comment card.
 */
export type ProjectTaskFeedEntry =
  | { kind: "activity"; at: string | null; activity: ProjectActivity }
  | { kind: "comment"; at: string | null; comment: ProjectTaskComment };

/** GET /projects/:id/tasks/:taskId — the full task detail bundle. */
export interface ProjectTaskDetail {
  task: ProjectTask;
  subtasks: ProjectTask[];
  labels: ProjectLabel[];
  dependencies: ProjectTaskDependencies;
  comments: ProjectTaskComment[];
  activity: ProjectActivity[];
  /** Activity + comments merged chronologically, each tagged by `kind`. */
  feed: ProjectTaskFeedEntry[];
}

/** GET /projects/:id/milestones row. */
export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  dueDate: string | null;
  status: ProjectMilestoneStatus;
  completedAt: string | null;
  position: number;
  createdAt: string;
}

/** GET /projects/:id/members row. */
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Time tracking — live timers + logged work. A user runs at most ONE timer at a
// time; starting another auto-stops the previous. `elapsedMinutes` and
// `startedAt` let the client tick a live clock without polling every second.
// ---------------------------------------------------------------------------

/** GET /timers/active and POST /timers/start → the user's running timer. */
export interface RunningTimer {
  id: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  userId: string;
  userName: string;
  /** ISO timestamp the timer began — drives the live elapsed clock. */
  startedAt: string;
  note: string | null;
  /** Whole minutes elapsed at the time the payload was built. */
  elapsedMinutes: number;
}

/** POST /timers/stop → confirmation + the persisted time log. */
export interface StopTimerResult {
  stopped: true;
  minutes: number;
  timeLog: TimeLog;
}

/** GET /projects/:id/timers row — who is actively working on the project now. */
export interface ProjectActiveTimer {
  userId: string;
  userName: string;
  taskId: string | null;
  taskTitle: string | null;
  startedAt: string;
  elapsedMinutes: number;
}

/** GET /projects/:id/time-summary payload. */
export interface ProjectTimeSummary {
  totalMinutes: number;
  byMember: Array<{ userId: string; userName: string; minutes: number }>;
  byTask: Array<{ taskId: string; taskTitle: string; minutes: number }>;
  activeTimers: ProjectActiveTimer[];
  logCount: number;
}

/** GET /projects/:id/time-logs row. */
export interface ProjectTimeLog {
  id: string;
  minutes: number;
  workDate: string;
  note: string | null;
  userId: string;
  userName: string;
  taskId: string | null;
  taskTitle: string | null;
}

/**
 * GET /projects/:id/activity row — an audit-log entry. `action` is a dotted verb
 * ("task.create", "task.status_change", "timer.stop", "member.add", …) and
 * `metadata` carries human-relevant fields used to render a readable summary.
 */
export interface ProjectActivity {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** GET /projects/:id/overview — the boss-dashboard rollup. */
export interface ProjectOverview {
  tasksByStatus: Record<ProjectTaskStatus, number>;
  taskTotal: number;
  taskDone: number;
  milestoneTotal: number;
  milestoneDone: number;
  memberCount: number;
  totalTimeMinutes: number;
  activeTimerCount: number;
  recentActivity: ProjectActivity[];
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

// ---------------------------------------------------------------------------
// Messaging — threaded inbox + realtime chat (REST + Socket.IO).
// ---------------------------------------------------------------------------

export type ThreadStatus = "open" | "awaiting" | "closed";

/** A user participating in a thread. */
export interface Participant {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

/** GET /messages/threads row + POST/PATCH responses. */
export interface ThreadSummary {
  id: string;
  subject: string;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  status: ThreadStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdBy: string | null;
  createdAt: string;
  participants: Participant[];
  unreadCount: number;
}

/** GET /messages/threads/:id — full thread (currently same shape as summary). */
export type Thread = ThreadSummary;

/** GET /messages/threads/:id/messages row + 'message:new' payload. */
export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  /** Client-side only: present on optimistic/echoed messages for dedupe. */
  clientMsgId?: string;
  /** Client-side only: optimistic message not yet acked by the server. */
  pending?: boolean;
}

/** A partial thread patch broadcast over 'thread:updated'. */
export interface ThreadUpdate {
  id: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  status?: ThreadStatus;
  unreadCount?: number;
}

/** Payload broadcast over 'typing'. */
export interface TypingEvent {
  threadId: string;
  userId: string;
  name: string;
  isTyping: boolean;
}

/** Payload broadcast over 'thread:read'. */
export interface ThreadReadEvent {
  threadId: string;
  userId: string;
  lastReadAt: string;
}

// ---------------------------------------------------------------------------
// Documents — the Document Hub. Files live on Cloudinary (direct browser
// upload); we only persist metadata + the secure URL.
// ---------------------------------------------------------------------------

export type DocumentCategory =
  | "contract"
  | "nda"
  | "proposal"
  | "deliverable"
  | "invoice"
  | "report"
  | "design"
  | "ai_generated"
  | "misc";

/** Cloudinary resource type for a stored document. */
export type DocumentResourceType = "image" | "raw" | "video";

/** GET /documents row (and POST/PATCH /documents responses). */
export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  fileUrl: string;
  publicId: string;
  resourceType: DocumentResourceType;
  format: string | null;
  mimeType: string | null;
  sizeBytes: number;
  clientVisible: 0 | 1;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
}
