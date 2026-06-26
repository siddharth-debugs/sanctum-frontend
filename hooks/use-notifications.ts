"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSocket } from "@/lib/socket";
import type { AppNotification } from "@/lib/api/types";

export function useNotifications(unreadOnly = false) {
  return useQuery<AppNotification[]>({
    queryKey: queryKeys.notifications(unreadOnly),
    queryFn: () =>
      api<AppNotification[]>("/notifications", {
        query: { unreadOnly: unreadOnly ? "true" : undefined, limit: 30 },
      }),
  });
}

export function useNotificationsUnreadCount() {
  return useQuery<number>({
    queryKey: queryKeys.notificationsUnread,
    queryFn: async () => {
      const r = await api<{ count: number }>("/notifications/unread-count");
      return r.count;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/**
 * Subscribe to live 'notification:new' events: refresh the bell + toast.
 * Mount once (in the app shell).
 */
export function useNotificationStream() {
  const { socket } = useSocket();
  const qc = useQueryClient();

  React.useEffect(() => {
    const onNew = (n: AppNotification) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      // A leave/regularization decision or request also affects attendance views.
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast(n.title, { description: n.body ?? undefined });
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket, qc]);
}
