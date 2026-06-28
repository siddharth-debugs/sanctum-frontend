"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSocket } from "@/lib/socket";
import { useSession } from "@/app/(app)/session-context";
import type {
  Message,
  MessageAttachment,
  MessageDeletedEvent,
  Thread,
  ThreadStatus,
  ThreadSummary,
  ThreadUpdate,
  TypingEvent,
} from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Cache helpers — shared between socket listeners so every live event patches
// the same query caches consistently.
// ---------------------------------------------------------------------------

/** Reorder threads by most-recent activity (nulls last). */
function sortThreads(rows: ThreadSummary[]): ThreadSummary[] {
  return [...rows].sort((a, b) => {
    const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bt - at;
  });
}

/** Patch every cached thread-list query (all filter variants). */
function patchThreadLists(
  qc: QueryClient,
  patch: (rows: ThreadSummary[]) => ThreadSummary[],
) {
  qc.setQueriesData<ThreadSummary[]>({ queryKey: ["threads"] }, (rows) => {
    if (!rows || !Array.isArray(rows)) return rows;
    return patch(rows);
  });
}

function applyThreadUpdate(
  rows: ThreadSummary[],
  update: ThreadUpdate & Partial<ThreadSummary>,
): ThreadSummary[] {
  const idx = rows.findIndex((t) => t.id === update.id);
  if (idx === -1) return rows;
  const merged: ThreadSummary = {
    ...rows[idx],
    ...update,
    // Never let a partial update blow away required nested shapes.
    participants: update.participants ?? rows[idx].participants,
  };
  const next = [...rows];
  next[idx] = merged;
  return sortThreads(next);
}

// ---------------------------------------------------------------------------
// useThreads — REST list + live patching from socket events.
// ---------------------------------------------------------------------------

export interface ThreadFilters extends Record<string, unknown> {
  status?: ThreadStatus;
  search?: string;
  /** Scope the list to a single client (server-side filter). */
  clientId?: string;
}

export function useThreads(filters?: ThreadFilters) {
  const qc = useQueryClient();
  const { socket } = useSocket();

  // Only the server-supported params hit the wire; search is also client-side.
  const queryParams: Record<string, string> = {};
  if (filters?.status) queryParams.status = filters.status;
  if (filters?.search) queryParams.search = filters.search;
  if (filters?.clientId) queryParams.clientId = filters.clientId;

  const query = useQuery({
    queryKey: queryKeys.threads(filters),
    queryFn: () =>
      api<ThreadSummary[]>("/messages/threads", {
        query: queryParams,
      }),
    select: sortThreads,
  });

  React.useEffect(() => {
    const onCreated = (thread: ThreadSummary) => {
      patchThreadLists(qc, (rows) => {
        if (rows.some((t) => t.id === thread.id)) {
          return applyThreadUpdate(rows, thread);
        }
        return sortThreads([thread, ...rows]);
      });
    };

    const onUpdated = (update: ThreadUpdate & Partial<ThreadSummary>) => {
      patchThreadLists(qc, (rows) => applyThreadUpdate(rows, update));
    };

    const onRead = (payload: { threadId: string; userId: string }) => {
      // Our own read receipt clears the unread badge for that thread.
      patchThreadLists(qc, (rows) =>
        applyThreadUpdate(rows, { id: payload.threadId, unreadCount: 0 }),
      );
    };

    socket.on("thread:created", onCreated);
    socket.on("thread:updated", onUpdated);
    socket.on("thread:read", onRead);
    return () => {
      socket.off("thread:created", onCreated);
      socket.off("thread:updated", onUpdated);
      socket.off("thread:read", onRead);
    };
  }, [socket, qc]);

  return query;
}

/** GET /messages/threads/:id — single thread detail. */
export function useThread(threadId: string | null) {
  return useQuery({
    queryKey: queryKeys.thread(threadId ?? ""),
    queryFn: () => api<Thread>(`/messages/threads/${threadId}`),
    enabled: !!threadId,
  });
}

// ---------------------------------------------------------------------------
// useThreadMessages — REST history + live appends; join/leave the thread room;
// mark-as-read on open/focus.
// ---------------------------------------------------------------------------

export function useThreadMessages(threadId: string | null) {
  const qc = useQueryClient();
  const { socket, connected } = useSocket();

  const query = useQuery({
    queryKey: queryKeys.threadMessages(threadId ?? ""),
    queryFn: () =>
      api<Message[]>(`/messages/threads/${threadId}/messages`, {
        query: { limit: 50 },
      }),
    enabled: !!threadId,
  });

  // Mark the thread read: POST + socket emit, then clear local unread.
  const markRead = React.useCallback(() => {
    if (!threadId) return;
    api(`/messages/threads/${threadId}/read`, { method: "POST" }).catch(
      () => {},
    );
    socket.emit("message:read", { threadId });
    patchThreadLists(qc, (rows) =>
      applyThreadUpdate(rows, { id: threadId, unreadCount: 0 }),
    );
    qc.setQueryData<{ count: number }>(queryKeys.unreadCount, (prev) => {
      const rows =
        qc.getQueryData<ThreadSummary[]>(queryKeys.threads()) ?? [];
      const removed = rows.find((t) => t.id === threadId)?.unreadCount ?? 0;
      const next = Math.max(0, (prev?.count ?? 0) - removed);
      return { count: next };
    });
  }, [threadId, socket, qc]);

  // Join the room on open, leave on close. Re-join on reconnect.
  React.useEffect(() => {
    if (!threadId) return;
    const join = () => {
      socket.emit("thread:open", threadId);
      // Refetch history after a (re)connect so we don't miss messages.
      qc.invalidateQueries({ queryKey: queryKeys.threadMessages(threadId) });
      markRead();
    };

    if (socket.connected) join();
    socket.on("connect", join);

    return () => {
      socket.off("connect", join);
      socket.emit("thread:close", threadId);
    };
  }, [threadId, socket, qc, markRead]);

  // Mark read once history loads / when the thread changes.
  React.useEffect(() => {
    if (threadId && query.isSuccess) markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, query.isSuccess]);

  // Live append + dedupe (by id or clientMsgId).
  React.useEffect(() => {
    if (!threadId) return;
    const onNew = (message: Message) => {
      if (message.threadId !== threadId) return;
      qc.setQueryData<Message[]>(
        queryKeys.threadMessages(threadId),
        (prev) => {
          const list = prev ?? [];
          const i = list.findIndex(
            (m) =>
              m.id === message.id ||
              (!!message.clientMsgId && m.clientMsgId === message.clientMsgId) ||
              // Race: our own optimistic bubble is still pending (temp id) and
              // the broadcast echo — which carries no clientMsgId — arrived
              // before the send ack. Match it by sender + body so we replace
              // the optimistic message instead of appending a duplicate.
              (m.pending === true &&
                m.senderId === message.senderId &&
                m.body === message.body),
          );
          if (i !== -1) {
            const next = [...list];
            next[i] = { ...message, pending: false };
            return next;
          }
          return [...list, message];
        },
      );
      // We're looking at this thread, so keep it read.
      markRead();
    };

    // An edit (body / editedAt) patches the cached message in place.
    const onUpdated = (message: Message) => {
      if (message.threadId !== threadId) return;
      qc.setQueryData<Message[]>(
        queryKeys.threadMessages(threadId),
        (prev) => {
          const list = prev ?? [];
          const i = list.findIndex((m) => m.id === message.id);
          if (i === -1) return list;
          const next = [...list];
          next[i] = { ...next[i], ...message, pending: false };
          return next;
        },
      );
    };

    // A delete drops the message from the cache.
    const onDeleted = (payload: MessageDeletedEvent) => {
      if (payload.threadId !== threadId) return;
      qc.setQueryData<Message[]>(
        queryKeys.threadMessages(threadId),
        (prev) => (prev ?? []).filter((m) => m.id !== payload.messageId),
      );
    };

    socket.on("message:new", onNew);
    socket.on("message:updated", onUpdated);
    socket.on("message:deleted", onDeleted);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:updated", onUpdated);
      socket.off("message:deleted", onDeleted);
    };
  }, [threadId, socket, qc, markRead]);

  return { ...query, markRead, connected };
}

// ---------------------------------------------------------------------------
// useSendMessage — optimistic send over socket with REST fallback + typing.
// ---------------------------------------------------------------------------

function makeClientMsgId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useSendMessage(threadId: string | null) {
  const qc = useQueryClient();
  const { socket, connected } = useSocket();
  const session = useSession();

  const insertOptimistic = React.useCallback(
    (
      body: string,
      clientMsgId: string,
      attachments?: MessageAttachment[],
    ): Message => {
      const optimistic: Message = {
        id: clientMsgId,
        threadId: threadId ?? "",
        senderId: session.user.id,
        senderName: session.user.fullName ?? session.user.email,
        senderAvatarUrl: null,
        body,
        attachments: attachments ?? [],
        createdAt: new Date().toISOString(),
        clientMsgId,
        pending: true,
      };
      qc.setQueryData<Message[]>(
        queryKeys.threadMessages(threadId ?? ""),
        (prev) => [...(prev ?? []), optimistic],
      );
      return optimistic;
    },
    [qc, threadId, session.user],
  );

  const reconcile = React.useCallback(
    (message: Message, clientMsgId: string) => {
      qc.setQueryData<Message[]>(
        queryKeys.threadMessages(threadId ?? ""),
        (prev) => {
          const list = prev ?? [];
          const i = list.findIndex(
            (m) => m.clientMsgId === clientMsgId || m.id === message.id,
          );
          if (i === -1) return [...list, { ...message, pending: false }];
          const next = [...list];
          next[i] = { ...message, clientMsgId, pending: false };
          return next;
        },
      );
    },
    [qc, threadId],
  );

  const markFailed = React.useCallback(
    (clientMsgId: string) => {
      qc.setQueryData<Message[]>(
        queryKeys.threadMessages(threadId ?? ""),
        (prev) =>
          (prev ?? []).filter((m) => m.clientMsgId !== clientMsgId),
      );
    },
    [qc, threadId],
  );

  const send = React.useCallback(
    async (raw: string) => {
      const body = raw.trim();
      if (!body || !threadId) return;
      const clientMsgId = makeClientMsgId();
      insertOptimistic(body, clientMsgId);

      if (connected) {
        socket.emit(
          "message:send",
          { threadId, body, clientMsgId },
          (res) => {
            if (res?.ok && res.message) {
              reconcile(res.message, clientMsgId);
            } else {
              // Ack failed — fall back to REST.
              sendRest();
            }
          },
        );
        // Safety: if no ack arrives, fall back after a timeout.
        return;
      }

      sendRest();

      async function sendRest() {
        try {
          const message = await api<Message>(
            `/messages/threads/${threadId}/messages`,
            { method: "POST", body: { body } },
          );
          reconcile(message, clientMsgId);
        } catch {
          markFailed(clientMsgId);
        }
      }
    },
    [
      threadId,
      connected,
      socket,
      insertOptimistic,
      reconcile,
      markFailed,
    ],
  );

  // Attachments always go via REST: the server persists them and broadcasts
  // 'message:new' to everyone (including us), which reconciles the optimistic
  // bubble. A body is optional when ≥1 attachment is present.
  const sendWithAttachments = React.useCallback(
    async (raw: string, attachments: MessageAttachment[]) => {
      const body = raw.trim();
      if (!threadId) return;
      if (!body && attachments.length === 0) return;
      const clientMsgId = makeClientMsgId();
      insertOptimistic(body, clientMsgId, attachments);
      try {
        const message = await api<Message>(
          `/messages/threads/${threadId}/messages`,
          { method: "POST", body: { body, attachments } },
        );
        reconcile({ ...message, clientMsgId }, clientMsgId);
      } catch {
        markFailed(clientMsgId);
        throw new Error("Failed to send attachment");
      }
    },
    [threadId, insertOptimistic, reconcile, markFailed],
  );

  // Debounced typing emitter.
  const typingTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isTypingRef = React.useRef(false);

  const emitTyping = React.useCallback(() => {
    if (!threadId || !connected) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { threadId, isTyping: true });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing", { threadId, isTyping: false });
    }, 1800);
  }, [threadId, connected, socket]);

  React.useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  return { send, sendWithAttachments, emitTyping };
}

// ---------------------------------------------------------------------------
// useEditMessage / useDeleteMessage — mutate a single message (own messages;
// delete also allowed for owner/admin on any). The server broadcasts
// 'message:updated' / 'message:deleted'; we also patch the cache locally so the
// author sees the change instantly without waiting for the echo.
// ---------------------------------------------------------------------------

export function useEditMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      api<Message>(`/messages/threads/${threadId}/messages/${messageId}`, {
        method: "PATCH",
        body: { body },
      }),
    onSuccess: (message) => {
      qc.setQueryData<Message[]>(
        queryKeys.threadMessages(threadId),
        (prev) => {
          const list = prev ?? [];
          const i = list.findIndex((m) => m.id === message.id);
          if (i === -1) return list;
          const next = [...list];
          next[i] = { ...next[i], ...message, pending: false };
          return next;
        },
      );
    },
  });
}

export function useDeleteMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      api<{ deleted: true }>(
        `/messages/threads/${threadId}/messages/${messageId}`,
        { method: "DELETE" },
      ),
    onSuccess: (_data, messageId) => {
      qc.setQueryData<Message[]>(
        queryKeys.threadMessages(threadId),
        (prev) => (prev ?? []).filter((m) => m.id !== messageId),
      );
    },
  });
}

// ---------------------------------------------------------------------------
// useTypingIndicator — collect who is typing in a thread (excludes self).
// ---------------------------------------------------------------------------

export function useTypingIndicator(threadId: string | null) {
  const { socket } = useSocket();
  const session = useSession();
  const [typers, setTypers] = React.useState<Record<string, string>>({});
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  React.useEffect(() => {
    setTypers({});
  }, [threadId]);

  React.useEffect(() => {
    if (!threadId) return;
    const onTyping = (e: TypingEvent) => {
      if (e.threadId !== threadId) return;
      if (e.userId === session.user.id) return;
      if (timers.current[e.userId]) clearTimeout(timers.current[e.userId]);
      if (e.isTyping) {
        setTypers((prev) => ({ ...prev, [e.userId]: e.name }));
        timers.current[e.userId] = setTimeout(() => {
          setTypers((prev) => {
            const next = { ...prev };
            delete next[e.userId];
            return next;
          });
        }, 3000);
      } else {
        setTypers((prev) => {
          const next = { ...prev };
          delete next[e.userId];
          return next;
        });
      }
    };
    socket.on("typing", onTyping);
    return () => {
      socket.off("typing", onTyping);
    };
  }, [threadId, socket, session.user.id]);

  return Object.values(typers);
}

// ---------------------------------------------------------------------------
// Thread mutations — create / update status / participants / delete.
// ---------------------------------------------------------------------------

export interface CreateThreadInput {
  subject: string;
  participantIds: string[];
  clientId?: string;
  projectId?: string;
  body?: string;
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateThreadInput) =>
      api<ThreadSummary>("/messages/threads", {
        method: "POST",
        body: input,
      }),
    onSuccess: (thread) => {
      patchThreadLists(qc, (rows) =>
        rows.some((t) => t.id === thread.id)
          ? applyThreadUpdate(rows, thread)
          : sortThreads([thread, ...rows]),
      );
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

export interface UpdateThreadInput {
  subject?: string;
  status?: ThreadStatus;
  /** Re-link or clear the client (null clears it; clearing also clears project). */
  clientId?: string | null;
  /** Re-link or clear the project (null clears it). */
  projectId?: string | null;
  addParticipantIds?: string[];
  removeParticipantIds?: string[];
}

export function useUpdateThread(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateThreadInput) =>
      api<Thread>(`/messages/threads/${threadId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (thread) => {
      patchThreadLists(qc, (rows) => applyThreadUpdate(rows, thread));
      qc.setQueryData(queryKeys.thread(threadId), thread);
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) =>
      api<void>(`/messages/threads/${threadId}`, { method: "DELETE" }),
    onSuccess: (_data, threadId) => {
      patchThreadLists(qc, (rows) => rows.filter((t) => t.id !== threadId));
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

// ---------------------------------------------------------------------------
// useUnreadCount — total unread badge, kept live by socket events.
// ---------------------------------------------------------------------------

export function useUnreadCount() {
  const qc = useQueryClient();
  const { socket } = useSocket();

  const query = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => api<{ count: number }>("/messages/unread-count"),
    select: (d) => d.count,
  });

  React.useEffect(() => {
    // A new message in a thread the user isn't actively viewing bumps the
    // badge; the backend includes per-thread unread in 'thread:updated'.
    const onUpdated = (update: ThreadUpdate & Partial<ThreadSummary>) => {
      if (typeof update.unreadCount !== "number") return;
      // Recompute total from the cached thread list when available.
      const rows = qc.getQueryData<ThreadSummary[]>(queryKeys.threads());
      if (rows) {
        const total = rows.reduce(
          (sum, t) =>
            sum + (t.id === update.id ? update.unreadCount! : t.unreadCount),
          0,
        );
        qc.setQueryData(queryKeys.unreadCount, { count: total });
      } else if (update.unreadCount > 0) {
        qc.setQueryData<{ count: number }>(queryKeys.unreadCount, (prev) => ({
          count: (prev?.count ?? 0) + 1,
        }));
      }
    };

    const onCreated = () => {
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount });
    };

    socket.on("thread:updated", onUpdated);
    socket.on("thread:created", onCreated);
    return () => {
      socket.off("thread:updated", onUpdated);
      socket.off("thread:created", onCreated);
    };
  }, [socket, qc]);

  return query;
}

// ---------------------------------------------------------------------------
// Relative time — prefer date-fns (present), fall back to a tiny helper.
// ---------------------------------------------------------------------------

export { formatRelativeTime } from "@/lib/relative-time";
