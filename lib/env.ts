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
