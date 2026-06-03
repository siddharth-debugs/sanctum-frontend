export type ThemeName =
  | "bordeaux"
  | "nocturne"
  | "glacier"
  | "solstice"
  | "verdant"
  | "platinum";

export type Mode = "light" | "dark";

/**
 * Every theme variant supplies the SAME token keys for light + dark.
 * Components only consume semantic Tailwind utilities that resolve to these,
 * so swapping a theme/mode mutates only CSS variables — never component code.
 */
export interface TokenSet {
  // Core semantic surfaces (any valid CSS color string — hex/rgba ok)
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  border: string;
  input: string;
  ring: string;
  // Chart palette
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  // Sidebar surface tokens (shadcn sidebar)
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  // Glass
  glassBg: string;
  glassStrong: string;
  glassBorder: string;
  glassBlur: string;
  glassSat: string;
  glassShadow: string;
  glassHighlight: string;
  // Aurora background blobs
  aurora1: string;
  aurora2: string;
}

export interface ThemeDefinition {
  name: ThemeName;
  label: string;
  vibe: string;
  /** gradient used for the swatch in the ThemeSwitcher */
  swatch: string;
  radius: string;
  fontDisplay: string;
  fontSans: string;
  light: TokenSet;
  dark: TokenSet;
}
