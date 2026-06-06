"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import type {
  Message,
  ThreadSummary,
  ThreadUpdate,
  TypingEvent,
  ThreadReadEvent,
} from "@/lib/api/types";

/**
 * Typed Socket.IO contract for the messaging feature. The server lives at the
 * API ORIGIN (NEXT_PUBLIC_API_URL with the `/api/v1` suffix stripped) and the
 * httpOnly auth cookie is sent via `withCredentials`.
 */
export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "thread:updated": (thread: ThreadUpdate & Partial<ThreadSummary>) => void;
  "thread:created": (thread: ThreadSummary) => void;
  typing: (payload: TypingEvent) => void;
  "thread:read": (payload: ThreadReadEvent) => void;
}

export interface ClientToServerEvents {
  "thread:open": (
    threadId: string,
    ack?: (res: unknown) => void,
  ) => void;
  "thread:close": (threadId: string) => void;
  "message:send": (
    payload: { threadId: string; body: string; clientMsgId: string },
    ack?: (res: {
      ok: boolean;
      message?: Message;
      clientMsgId?: string;
      error?: string;
    }) => void,
  ) => void;
  typing: (payload: { threadId: string; isTyping: boolean }) => void;
  "message:read": (payload: { threadId: string }) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Resolve the Socket.IO origin from the REST base URL by stripping the API
 * path segment (e.g. `http://localhost:5050/api/v1` → `http://localhost:5050`).
 */
function resolveSocketOrigin(): string {
  try {
    const url = new URL(env.NEXT_PUBLIC_API_URL);
    return url.origin;
  } catch {
    return env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "");
  }
}

let socketSingleton: AppSocket | null = null;

/** Lazily create the (autoConnect:false) singleton socket. */
export function getSocket(): AppSocket {
  if (!socketSingleton) {
    socketSingleton = io(resolveSocketOrigin(), {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socketSingleton;
}

interface SocketContextValue {
  socket: AppSocket;
  connected: boolean;
}

const SocketContext = React.createContext<SocketContextValue | null>(null);

/**
 * Connects the singleton socket while the user is authenticated and tears it
 * down on logout/unmount. socket.io auto-reconnects on transient drops; a
 * `connected` boolean is exposed so consumers can re-join rooms / refetch on
 * reconnect via the `'connect'` event.
 */
export function SocketProvider({
  authenticated,
  children,
}: {
  authenticated: boolean;
  children: React.ReactNode;
}) {
  const socket = React.useMemo(() => getSocket(), []);
  const [connected, setConnected] = React.useState(socket.connected);

  React.useEffect(() => {
    if (!authenticated) {
      if (socket.connected) socket.disconnect();
      setConnected(false);
      return;
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (!socket.connected) socket.connect();
    else setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [authenticated, socket]);

  // Fully disconnect when the provider unmounts (e.g. app shell teardown).
  React.useEffect(() => {
    return () => {
      if (socketSingleton?.connected) socketSingleton.disconnect();
    };
  }, []);

  const value = React.useMemo<SocketContextValue>(
    () => ({ socket, connected }),
    [socket, connected],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

/** Access the live socket + connection state. Safe to call outside a provider
 * (returns a non-connected socket) so non-messaging pages don't crash. */
export function useSocket(): SocketContextValue {
  const ctx = React.useContext(SocketContext);
  if (ctx) return ctx;
  return { socket: getSocket(), connected: false };
}
