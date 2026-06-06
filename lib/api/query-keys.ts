/** Centralized TanStack Query key factory. */
export const queryKeys = {
  me: ["me"] as const,
  agency: ["agency"] as const,
  dashboard: (clientId?: string) => ["dashboard", clientId ?? "agency"] as const,
  usage: ["agency", "usage"] as const,
  clients: (filters?: Record<string, unknown>) =>
    ["clients", filters ?? {}] as const,
  client: (id: string) => ["clients", id] as const,
  posts: (clientId: string, filters?: Record<string, unknown>) =>
    ["clients", clientId, "posts", filters ?? {}] as const,
  post: (clientId: string, postId: string) =>
    ["clients", clientId, "posts", postId] as const,
  team: (filters?: Record<string, unknown>) => ["team", filters ?? {}] as const,
  teamMember: (id: string) => ["team", id] as const,
  teamMemberTimeLogs: (id: string) => ["team", id, "time-logs"] as const,
  projects: (filters?: Record<string, unknown>) =>
    ["projects", filters ?? {}] as const,
  project: (id: string) => ["projects", id] as const,
  projectTasks: (projectId: string) =>
    ["projects", projectId, "tasks"] as const,
  projectMilestones: (projectId: string) =>
    ["projects", projectId, "milestones"] as const,
  projectMembers: (projectId: string) =>
    ["projects", projectId, "members"] as const,
  portal: (token: string, month?: string) =>
    ["portal", token, month ?? "current"] as const,
  // Finance
  invoices: (filters?: Record<string, unknown>) =>
    ["invoices", filters ?? {}] as const,
  invoice: (id: string) => ["invoices", id] as const,
  expenses: (filters?: Record<string, unknown>) =>
    ["expenses", filters ?? {}] as const,
  expense: (id: string) => ["expenses", id] as const,
  financeOverview: (filters?: Record<string, unknown>) =>
    ["finance", "overview", filters ?? {}] as const,
  // Messaging
  threads: (filters?: Record<string, unknown>) =>
    ["threads", filters ?? {}] as const,
  thread: (id: string) => ["threads", id] as const,
  threadMessages: (threadId: string) =>
    ["threads", threadId, "messages"] as const,
  unreadCount: ["messages", "unread-count"] as const,
  // Documents
  documents: (filters?: Record<string, unknown>) =>
    ["documents", filters ?? {}] as const,
  document: (id: string) => ["documents", id] as const,
  // Sheets
  sheets: (filters?: Record<string, unknown>) =>
    ["sheets", filters ?? {}] as const,
  sheet: (id: string) => ["sheets", id] as const,
};
