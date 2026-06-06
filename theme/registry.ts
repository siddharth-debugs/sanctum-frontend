import type { ThemeDefinition, ThemeName } from "./types";

/**
 * THE single source of truth for the Sanctum theme (light + dark).
 *
 * There is exactly ONE theme — "evergreen" — a deep pine/jade green on warm
 * paper (light) / near-black green-tinted (dark), with a brass accent, paired
 * with a Bricolage Grotesque display + Hanken Grotesk body.
 *
 * Font tokens reference next/font CSS variables defined in app/fonts.ts.
 * The display stack falls back gracefully: Bricolage -> Hanken -> system sans.
 */

const FONT = {
  hanken: "var(--font-hanken), ui-sans-serif, system-ui, sans-serif",
  bricolage: `var(--font-bricolage), "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif`,
} as const;

export const THEME_REGISTRY: Record<ThemeName, ThemeDefinition> = {
  // ---------- EVERGREEN — deep pine/jade + brass accent, grotesque display ----------
  evergreen: {
    name: "evergreen",
    label: "Evergreen",
    vibe: "evergreen & brass",
    swatch: "linear-gradient(135deg,#1F5F4E,#B08534)",
    radius: "0.375rem",
    fontDisplay: FONT.bricolage,
    fontSans: FONT.hanken,
    light: {
      background: "#F6F4EF",
      foreground: "#16201C",
      card: "#FFFFFF",
      cardForeground: "#16201C",
      popover: "#FFFFFF",
      popoverForeground: "#16201C",
      primary: "#1F5F4E",
      primaryForeground: "#F1F5EF",
      secondary: "#E9EDE6",
      secondaryForeground: "#294037",
      muted: "#ECEFE9",
      mutedForeground: "#5C6A62",
      accent: "#B08534",
      accentForeground: "#221806",
      destructive: "#BB3B2E",
      destructiveForeground: "#FFFFFF",
      success: "#2E8B6B",
      warning: "#B7791F",
      border: "#E3E0D7",
      input: "#E3E0D7",
      ring: "#1F5F4E",
      chart1: "#1F5F4E",
      chart2: "#B08534",
      chart3: "#3E7C6A",
      chart4: "#8C6A3C",
      chart5: "#6BA98F",
      sidebar: "rgba(255,255,255,0.85)",
      sidebarForeground: "#16201C",
      sidebarPrimary: "#1F5F4E",
      sidebarPrimaryForeground: "#F1F5EF",
      sidebarAccent: "#ECEFE9",
      sidebarAccentForeground: "#16201C",
      sidebarBorder: "#E3E0D7",
      sidebarRing: "#1F5F4E",
      glassBg: "rgba(255,255,255,0.85)",
      glassStrong: "rgba(255,255,255,0.94)",
      glassBorder: "rgba(31,95,78,0.08)",
      glassBlur: "8px",
      glassSat: "110%",
      glassShadow: "0 1px 2px rgba(22,32,28,0.05), 0 6px 16px rgba(22,32,28,0.06)",
      glassHighlight: "rgba(255,255,255,0.5)",
      aurora1: "rgba(31,95,78,0.05)",
      aurora2: "rgba(176,133,52,0.05)",
    },
    dark: {
      background: "#0B0F0D",
      foreground: "#E8EDE9",
      card: "#121815",
      cardForeground: "#E8EDE9",
      popover: "#121815",
      popoverForeground: "#E8EDE9",
      primary: "#54B294",
      primaryForeground: "#06120E",
      secondary: "#1C2622",
      secondaryForeground: "#D8E0DA",
      muted: "#161D19",
      mutedForeground: "#93A39B",
      accent: "#D6A95A",
      accentForeground: "#1C1406",
      destructive: "#D45A4C",
      destructiveForeground: "#1A0A08",
      success: "#4FB07E",
      warning: "#D9B25A",
      border: "#283631",
      input: "#2C3A34",
      ring: "#54B294",
      chart1: "#54B294",
      chart2: "#D6A95A",
      chart3: "#6FBFA4",
      chart4: "#C2A05A",
      chart5: "#4E8C76",
      sidebar: "rgba(16,22,19,0.8)",
      sidebarForeground: "#E8EDE9",
      sidebarPrimary: "#54B294",
      sidebarPrimaryForeground: "#06120E",
      sidebarAccent: "#161D19",
      sidebarAccentForeground: "#E8EDE9",
      sidebarBorder: "#283631",
      sidebarRing: "#54B294",
      glassBg: "rgba(16,22,19,0.8)",
      glassStrong: "rgba(16,22,19,0.92)",
      glassBorder: "rgba(214,169,90,0.1)",
      glassBlur: "8px",
      glassSat: "110%",
      glassShadow: "0 1px 2px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.38)",
      glassHighlight: "rgba(255,255,255,0.05)",
      aurora1: "rgba(84,178,148,0.08)",
      aurora2: "rgba(214,169,90,0.05)",
    },
  },
};

export const THEME_LIST = Object.values(THEME_REGISTRY);
export const DEFAULT_THEME: ThemeName = "evergreen";
