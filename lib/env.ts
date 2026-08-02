/**
 * Public, build-time-inlined env vars. Only NEXT_PUBLIC_* values are safe to
 * reference on the client. Falls back to sensible local defaults so the app
 * (and `pnpm build`) works before the backend is wired.
 */
// The live production backend. Used when NEXT_PUBLIC_API_URL is unset OR still
// points at a decommissioned Render URL — an older Vercel env var referenced
// `sanctum-backend-nxgr`, a service that no longer exists. The env var is still
// preferred whenever it names a live host, so simply updating it in Vercel later
// "just works" again (this pin self-heals).
const PROD_API_URL = "https://sanctum-backend-uacb.onrender.com/api/v1";
const DEAD_API_HOSTS = ["sanctum-backend-nxgr.onrender.com"];

function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  const configuredIsDead =
    !!configured && DEAD_API_HOSTS.some((h) => configured.includes(h));
  const isLocalhost =
    !!configured && (configured.includes("localhost") || configured.includes("127.0.0.1"));

  // In production, ignore any local .env overrides pointing to localhost
  if (configured && !configuredIsDead && (!isLocalhost || process.env.NODE_ENV !== "production")) {
    return configured;
  }
  return process.env.NODE_ENV === "production"
    ? PROD_API_URL
    : "http://localhost:5050/api/v1";
}

export const env = {
  NEXT_PUBLIC_API_URL: resolveApiUrl(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "demo",
} as const;

/**
 * True when a real API base URL is configured (the common case). Used to gate
 * the legacy mock fallbacks: when the API is configured we surface real errors
 * and empty states instead of faking data. Production always has a real backend
 * (pinned above), so it's true there regardless of the env var.
 */
export const isApiConfigured =
  Boolean(process.env.NEXT_PUBLIC_API_URL) ||
  process.env.NODE_ENV === "production";

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
    // Only rewrite for LAN dev testing, never on a public domain like app.thecreativemonk.in
    const pageIsLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.startsWith("192.168.") || window.location.hostname.startsWith("10.");
    if (isLocal && pageIsLocal && window.location.hostname !== u.hostname) {
      u.hostname = window.location.hostname;
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return configured;
  }
}

