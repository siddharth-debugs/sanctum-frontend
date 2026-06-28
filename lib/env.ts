/**
 * Public, build-time-inlined env vars. Only NEXT_PUBLIC_* values are safe to
 * reference on the client. Falls back to sensible local defaults so the app
 * (and `pnpm build`) works before the backend is wired.
 */
export const env = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "demo",
} as const;

/**
 * True when a real API base URL is configured (the common case). Used to gate
 * the legacy mock fallbacks: when the API is configured we surface real errors
 * and empty states instead of faking data.
 */
export const isApiConfigured = Boolean(process.env.NEXT_PUBLIC_API_URL);

/**
 * Runtime API base URL. When the configured host is localhost but the page is
 * actually served from another host — e.g. opening the dev server over the LAN
 * from a phone at http://192.168.x.x:3000 — rewrite the API host to match the
 * page, so the request reaches the same machine's backend instead of the
 * device's own localhost. No-op on the server and for non-local hosts (prod).
 */
export function apiBaseUrl(): string {
  const configured = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  if (typeof window === "undefined") return configured;
  try {
    const u = new URL(configured);
    const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (isLocal && window.location.hostname !== u.hostname) {
      u.hostname = window.location.hostname;
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return configured;
  }
}
