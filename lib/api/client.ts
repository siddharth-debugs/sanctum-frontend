import { apiBaseUrl } from "@/lib/env";
import type { ApiEnvelope, ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOpts extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Agency session token (when not using httpOnly cookies). */
  token?: string;
  /** Opaque portal share token for client-facing reads. */
  portalToken?: string;
  /** Append query params. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOpts["query"]) {
  const base = apiBaseUrl();
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Auth endpoints that must NOT trigger a refresh-on-401 (avoids loops on the
 * refresh/login flow itself).
 */
const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/refresh",
  "/auth/logout",
];

/**
 * Shared in-flight refresh. When the 15-minute access token expires, many
 * requests 401 at once; they all await this single POST /auth/refresh and then
 * retry, instead of each hammering the refresh endpoint.
 */
let refreshInFlight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Typed fetch wrapper hitting the separate Express API at NEXT_PUBLIC_API_URL.
 * Returns the unwrapped `data` from the standard envelope. Sends credentials so
 * httpOnly cookie auth works cross-origin; also supports Bearer + portal tokens.
 *
 * On a 401 (expired access token) it transparently calls POST /auth/refresh
 * once and retries, so the session stays alive without flooding the console or
 * bouncing the user to /login.
 */
export async function apiRequest<T>(
  path: string,
  opts: RequestOpts = {},
): Promise<ApiEnvelope<T>> {
  const { body, token, portalToken, headers, query, ...rest } = opts;

  const send = () =>
    fetch(buildUrl(path, query), {
      ...rest,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(portalToken ? { Authorization: `Bearer ${portalToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

  let res = await send();

  // Cookie-auth 401 -> try a single refresh + retry. Skip for portal/Bearer
  // calls and for the auth flow itself.
  const canRefresh =
    !portalToken &&
    !token &&
    !NO_REFRESH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (res.status === 401 && canRefresh) {
    const ok = await refreshSession();
    if (ok) res = await send();
  }

  if (res.status === 204) {
    return { data: undefined as T };
  }

  const json = (await res.json().catch(() => undefined)) as
    | (ApiEnvelope<T> & Partial<ApiErrorBody>)
    | undefined;

  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(
      res.status,
      err?.message ?? res.statusText,
      err?.code,
      json,
    );
  }

  return (json ?? { data: undefined as T }) as ApiEnvelope<T>;
}

/** Convenience helper returning just the unwrapped data. */
export async function api<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const env = await apiRequest<T>(path, opts);
  return env.data;
}
