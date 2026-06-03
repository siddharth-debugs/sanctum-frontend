import localFont from "next/font/local";
import {
  Inter,
  Plus_Jakarta_Sans,
  Fraunces,
  Sora,
  Bricolage_Grotesque,
  Geist,
} from "next/font/google";

/**
 * Font wiring for all six themes.
 * - Geist (Glacier display+body) via next/font/google
 * - Inter, Plus Jakarta, Fraunces, Sora, Bricolage Grotesque via Google
 * - Clash Display self-hosted from Fontshare (woff2 in ./fonts)
 *
 * Bricolage Grotesque was self-host TODO from Fontshare, but Fontshare no
 * longer serves it, so it is loaded from Google Fonts (it is available there).
 * Clash Display is NOT on Google, so it is self-hosted; falls back to Sora/Geist
 * via the CSS font stacks in theme/registry.ts if the files are unavailable.
 */

export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const clash = localFont({
  variable: "--font-clash",
  display: "swap",
  src: [
    { path: "./fonts/clash-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/clash-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/clash-700.woff2", weight: "700", style: "normal" },
  ],
});

export const fontVariables = [
  geist.variable,
  inter.variable,
  jakarta.variable,
  fraunces.variable,
  sora.variable,
  bricolage.variable,
  clash.variable,
].join(" ");
