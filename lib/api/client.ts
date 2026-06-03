import { env } from "@/lib/env";
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
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Typed fetch wrapper hitting the separate Express API at NEXT_PUBLIC_API_URL.
 * Returns the unwrapped `data` from the standard envelope. Sends credentials so
 * httpOnly cookie auth works cross-origin; also supports Bearer + portal tokens.
 */
export async function apiRequest<T>(
  path: string,
  opts: RequestOpts = {},
): Promise<ApiEnvelope<T>> {
  const { body, token, portalToken, headers, query, ...rest } = opts;

  const res = await fetch(buildUrl(path, query), {
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
