import type { SessionTokens } from "@/lib/api/types";

/**
 * Client-side session token store (localStorage).
 *
 * Sanctum's API + realtime socket authenticate with a Bearer access token so
 * login works on EVERY device. The frontend (Vercel) and API (Render) are on
 * different domains, so the auth cookie is a third-party cookie — and iOS/iPadOS
 * WebKit (Safari AND Chrome, which is WebKit under the hood) blocks third-party
 * cookies by default, which bounced iPad/iPhone users straight back to login.
 * The server still sets cookies (a fine fallback on desktop), but these tokens
 * are the primary transport and are sent as `Authorization: Bearer`.
 *
 * localStorage (not memory) so the session survives reloads/new tabs. All
 * accessors are SSR-safe (return null / no-op when `window` is absent) and
 * swallow storage errors (private mode / disabled storage) so a failure just
 * degrades to cookie auth rather than throwing.
 */
const ACCESS_KEY = "sanctum_at";
const REFRESH_KEY = "sanctum_rt";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return safeGet(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return safeGet(REFRESH_KEY);
}

export function setAuthTokens(tokens: SessionTokens): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCESS_KEY, tokens.access);
    window.localStorage.setItem(REFRESH_KEY, tokens.refresh);
  } catch {
    /* storage unavailable — cookie auth remains as the fallback */
  }
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}
