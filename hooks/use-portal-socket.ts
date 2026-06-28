"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { apiBaseUrl } from "@/lib/env";

/** Socket.IO origin = API base URL with the `/api/v1` suffix stripped. */
function resolveOrigin(): string {
  try {
    return new URL(apiBaseUrl()).origin;
  } catch {
    return apiBaseUrl().replace(/\/api\/v1\/?$/, "");
  }
}

/**
 * Live portal connection. Authenticates with the opaque portal token (no
 * cookie) and invokes `onRefresh` whenever the agency changes this client's
 * content — so the portal updates without a manual reload.
 */
export function usePortalSocket(token: string, onRefresh: () => void) {
  const cb = React.useRef(onRefresh);
  cb.current = onRefresh;

  React.useEffect(() => {
    if (!token) return;
    const socket: Socket = io(resolveOrigin(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { portalToken: token },
    });
    const handler = () => cb.current();
    socket.on("portal:refresh", handler);
    return () => {
      socket.off("portal:refresh", handler);
      socket.disconnect();
    };
  }, [token]);
}
