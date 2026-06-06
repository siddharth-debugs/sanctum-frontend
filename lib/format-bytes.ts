/**
 * Byte formatter for file sizes. e.g. formatBytes(73728) → "72 KB",
 * formatBytes(1468006) → "1.4 MB". Re-exported from lib/utils so call sites can
 * import from either place; the canonical implementation lives in lib/utils.ts.
 */
export { formatBytes } from "@/lib/utils";
