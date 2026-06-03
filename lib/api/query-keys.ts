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
  team: () => ["team"] as const,
  portal: (token: string, month?: string) =>
    ["portal", token, month ?? "current"] as const,
};
