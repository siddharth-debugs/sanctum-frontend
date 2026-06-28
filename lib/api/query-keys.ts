/** Centralized TanStack Query key factory. */
export const queryKeys = {
  me: ["me"] as const,
  resetToken: (token: string | null) => ["reset-token", token] as const,
  agency: ["agency"] as const,
  rolePermissions: ["agency", "roles"] as const,
  customRoles: ["agency", "custom-roles"] as const,
  dashboard: (clientId?: string) => ["dashboard", clientId ?? "agency"] as const,
  usage: ["agency", "usage"] as const,
  clients: (filters?: Record<string, unknown>) =>
    ["clients", filters ?? {}] as const,
  client: (id: string) => ["clients", id] as const,
  // CRM
  contacts: (clientId: string) => ["crm", "contacts", clientId] as const,
  clientNotes: (clientId: string) => ["crm", "notes", clientId] as const,
  clientTags: (clientId: string) => ["crm", "client-tags", clientId] as const,
  tags: ["crm", "tags"] as const,
  pipeline: ["crm", "deals"] as const,
  clientDeals: (clientId: string) => ["crm", "deals", clientId] as const,
  followUps: ["crm", "follow-ups"] as const,
  posts: (clientId: string, filters?: Record<string, unknown>) =>
    ["clients", clientId, "posts", filters ?? {}] as const,
  post: (clientId: string, postId: string) =>
    ["clients", clientId, "posts", postId] as const,
  postComments: (clientId: string, postId: string) =>
    ["clients", clientId, "posts", postId, "comments"] as const,
  postApprovals: (clientId: string, postId: string) =>
    ["clients", clientId, "posts", postId, "approvals"] as const,
  team: (filters?: Record<string, unknown>) => ["team", filters ?? {}] as const,
  teamMember: (id: string) => ["team", id] as const,
  teamMemberTimeLogs: (id: string) => ["team", id, "time-logs"] as const,
  teamMemberActivity: (id: string) => ["team", id, "activity"] as const,
  projects: (filters?: Record<string, unknown>) =>
    ["projects", filters ?? {}] as const,
  project: (id: string) => ["projects", id] as const,
  projectTasks: (projectId: string, params?: Record<string, unknown>) =>
    ["projects", projectId, "tasks", params ?? {}] as const,
  projectTask: (projectId: string, taskId: string) =>
    ["projects", projectId, "tasks", taskId, "detail"] as const,
  projectTaskSubtasks: (projectId: string, taskId: string) =>
    ["projects", projectId, "tasks", taskId, "subtasks"] as const,
  projectTaskComments: (projectId: string, taskId: string) =>
    ["projects", projectId, "tasks", taskId, "comments"] as const,
  projectTaskDependencies: (projectId: string, taskId: string) =>
    ["projects", projectId, "tasks", taskId, "dependencies"] as const,
  projectTaskTimeLogs: (projectId: string, taskId: string) =>
    ["projects", projectId, "tasks", taskId, "time-logs"] as const,
  projectLabels: (projectId: string) =>
    ["projects", projectId, "labels"] as const,
  projectMilestones: (projectId: string) =>
    ["projects", projectId, "milestones"] as const,
  projectMembers: (projectId: string) =>
    ["projects", projectId, "members"] as const,
  projectOverview: (projectId: string) =>
    ["projects", projectId, "overview"] as const,
  projectActivity: (projectId: string) =>
    ["projects", projectId, "activity"] as const,
  projectTimers: (projectId: string) =>
    ["projects", projectId, "timers"] as const,
  projectTimeSummary: (projectId: string) =>
    ["projects", projectId, "time-summary"] as const,
  projectTimeLogs: (projectId: string) =>
    ["projects", projectId, "time-logs"] as const,
  // Timers (current user)
  activeTimer: ["timers", "active"] as const,
  portal: (token: string, month?: string) =>
    ["portal", token, month ?? "current"] as const,
  // Finance
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
  // Attendance
  attendancePolicy: ["attendance", "policy"] as const,
  attendanceToday: ["attendance", "today"] as const,
  attendanceCalendar: (month: string, userId?: string) =>
    ["attendance", "calendar", month, userId ?? "me"] as const,
  attendanceSummary: (month: string, userId?: string) =>
    ["attendance", "summary", month, userId ?? "me"] as const,
  holidays: (year: number) => ["attendance", "holidays", year] as const,
  whosIn: ["attendance", "whos-in"] as const,
  teamSummary: (month: string) => ["attendance", "team-summary", month] as const,
  leaveTypes: ["attendance", "leave-types"] as const,
  leaves: (scope: string, userId?: string) =>
    ["attendance", "leaves", scope, userId ?? "me"] as const,
  leaveBalances: (userId: string, year: number) =>
    ["attendance", "leave-balances", userId, year] as const,
  regularizations: (scope: string, userId?: string) =>
    ["attendance", "regularizations", scope, userId ?? "me"] as const,
  // Notifications
  notifications: (unreadOnly: boolean) =>
    ["notifications", unreadOnly ? "unread" : "all"] as const,
  notificationsUnread: ["notifications", "unread-count"] as const,
};
