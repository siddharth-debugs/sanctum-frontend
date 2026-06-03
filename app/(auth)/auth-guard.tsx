"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-me";

/**
 * Wraps the auth pages: if the visitor already has a valid session, send them
 * straight to the dashboard. A 401 simply means "not logged in" — stay here.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useMe();

  React.useEffect(() => {
    if (me.isSuccess && me.data) {
      router.replace("/dashboard");
    }
  }, [me.isSuccess, me.data, router]);

  return <>{children}</>;
}
