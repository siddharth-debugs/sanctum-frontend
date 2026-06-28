/**
 * Portal handle + platform helpers. Resolves a client's per-platform handle from
 * the (possibly empty) handlesJson, falling back to a slug of the client name —
 * so a preview always shows a plausible @handle even when none is configured.
 */

/** Lowercased, dot/underscore-safe slug used as the @handle fallback. */
export function slugHandle(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return s || "client";
}

/** Strip a leading @ and surrounding whitespace from a stored handle. */
export function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

/** Display name for a platform (used in switchers + a11y labels). */
export const PLATFORM_NAME: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  twitter: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

/**
 * Resolve the @handle for a platform: the configured handle for that platform,
 * else any configured handle, else a slug of the client name.
 */
export function handleFor(
  platform: string,
  handles: Record<string, string> | null | undefined,
  clientName: string,
): string {
  const map = handles ?? {};
  const direct = map[platform] ?? (platform === "x" ? map.twitter : undefined);
  if (direct) return cleanHandle(direct);
  // Any non-meta handle is a reasonable cross-platform fallback.
  for (const [k, v] of Object.entries(map)) {
    if (k === "sector" || !v) continue;
    return cleanHandle(v);
  }
  return slugHandle(clientName);
}

/** A human-readable display name for the brand inside a preview (e.g. "Aurora Cafe"). */
export function brandDisplayName(clientName: string): string {
  return clientName.trim() || "Your brand";
}

/** Platforms we render bespoke chrome for; everything else maps to a generic card-ish IG-like frame. */
export const SUPPORTED_PREVIEW_PLATFORMS = [
  "instagram",
  "facebook",
  "x",
  "linkedin",
  "youtube",
] as const;

/** Normalise a raw platform string to a supported preview key (twitter -> x). */
export function normalizePlatform(p: string): string {
  const k = p.toLowerCase();
  if (k === "twitter") return "x";
  return k;
}
