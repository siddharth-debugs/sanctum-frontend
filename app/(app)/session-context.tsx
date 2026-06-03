"use client";

import * as React from "react";
import type { MeResponse } from "@/lib/api/types";

const SessionContext = React.createContext<MeResponse | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: MeResponse;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

/** Read the authenticated session. Must be used inside the (app) layout. */
export function useSession(): MeResponse {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within the app SessionProvider");
  }
  return ctx;
}
