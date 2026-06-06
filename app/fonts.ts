import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";

/**
 * Font wiring for the single Sanctum theme ("evergreen").
 * - Hanken Grotesk — body / sans (var: --font-hanken)
 * - Bricolage Grotesque — display / headings (var: --font-bricolage)
 *
 * The display stack in theme/registry.ts / globals.css falls back to
 * "Hanken Grotesk" then the system sans stack if Bricolage fails to load.
 */

export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const fontVariables = [hanken.variable, bricolage.variable].join(" ");
