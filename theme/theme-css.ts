import { THEME_REGISTRY } from "./registry";
import type { TokenSet, ThemeDefinition } from "./types";

/** Map a TokenSet to the CSS custom-property declarations shadcn/Tailwind read. */
function toVars(t: TokenSet): string {
  return [
    `--background:${t.background}`,
    `--foreground:${t.foreground}`,
    `--card:${t.card}`,
    `--card-foreground:${t.cardForeground}`,
    `--popover:${t.popover}`,
    `--popover-foreground:${t.popoverForeground}`,
    `--primary:${t.primary}`,
    `--primary-foreground:${t.primaryForeground}`,
    `--secondary:${t.secondary}`,
    `--secondary-foreground:${t.secondaryForeground}`,
    `--muted:${t.muted}`,
    `--muted-foreground:${t.mutedForeground}`,
    `--accent:${t.accent}`,
    `--accent-foreground:${t.accentForeground}`,
    `--destructive:${t.destructive}`,
    `--destructive-foreground:${t.destructiveForeground}`,
    `--success:${t.success}`,
    `--warning:${t.warning}`,
    `--border:${t.border}`,
    `--input:${t.input}`,
    `--ring:${t.ring}`,
    `--chart-1:${t.chart1}`,
    `--chart-2:${t.chart2}`,
    `--chart-3:${t.chart3}`,
    `--chart-4:${t.chart4}`,
    `--chart-5:${t.chart5}`,
    `--sidebar:${t.sidebar}`,
    `--sidebar-foreground:${t.sidebarForeground}`,
    `--sidebar-primary:${t.sidebarPrimary}`,
    `--sidebar-primary-foreground:${t.sidebarPrimaryForeground}`,
    `--sidebar-accent:${t.sidebarAccent}`,
    `--sidebar-accent-foreground:${t.sidebarAccentForeground}`,
    `--sidebar-border:${t.sidebarBorder}`,
    `--sidebar-ring:${t.sidebarRing}`,
    `--glass-bg:${t.glassBg}`,
    `--glass-strong:${t.glassStrong}`,
    `--glass-border:${t.glassBorder}`,
    `--glass-blur:${t.glassBlur}`,
    `--glass-sat:${t.glassSat}`,
    `--glass-shadow:${t.glassShadow}`,
    `--glass-highlight:${t.glassHighlight}`,
    `--aurora-1:${t.aurora1}`,
    `--aurora-2:${t.aurora2}`,
  ].join(";");
}

function shapeVars(d: ThemeDefinition): string {
  return [
    `--radius:${d.radius}`,
    `--font-display:${d.fontDisplay}`,
    `--font-sans:${d.fontSans}`,
  ].join(";");
}

/**
 * Floating pickers/menus (select, combobox, dropdown menus, popovers) always
 * render as a DARK surface — even in light mode — for a premium, high-contrast
 * list with light text. Rather than touch any component, we re-point the
 * surface tokens on the portaled content to the theme's DARK palette; the whole
 * subtree (bg, text, borders, muted labels, highlight) recolors automatically
 * and stays theme-aware. In dark mode these resolve to the same values, so it's
 * a no-op there.
 */
const MENU_SURFACE_SLOTS = [
  '[data-slot="select-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="dropdown-menu-sub-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="command"]',
];

function menuSurfaceVars(t: TokenSet): string {
  return [
    `--popover:${t.popover}`,
    `--popover-foreground:${t.popoverForeground}`,
    `--foreground:${t.foreground}`,
    `--card:${t.card}`,
    `--card-foreground:${t.cardForeground}`,
    `--muted:${t.muted}`,
    `--muted-foreground:${t.mutedForeground}`,
    `--secondary:${t.secondary}`,
    `--secondary-foreground:${t.secondaryForeground}`,
    `--accent:${t.accent}`,
    `--accent-foreground:${t.accentForeground}`,
    `--primary:${t.primary}`,
    `--primary-foreground:${t.primaryForeground}`,
    `--border:${t.border}`,
    `--input:${t.input}`,
    `--ring:${t.ring}`,
    `color-scheme:dark`,
  ].join(";");
}

/**
 * Builds one stylesheet covering ALL variants x modes:
 *   [data-theme="x"]            -> light tokens + shape
 *   [data-theme="x"].dark       -> dark tokens
 * The DOM picks exactly one by attribute + class specificity. Swapping the
 * theme (data-theme) or mode (.dark) mutates ONLY tokens, never components.
 */
export function buildThemeCss(): string {
  return Object.values(THEME_REGISTRY)
    .map((d) => {
      const light = `[data-theme="${d.name}"]{${shapeVars(d)};${toVars(d.light)}}`;
      const dark = `[data-theme="${d.name}"].dark{${toVars(d.dark)}}`;
      // Dark picker/menu surface (applies in every mode; no-op in dark).
      const menuSel = MENU_SURFACE_SLOTS.map(
        (s) => `[data-theme="${d.name}"] ${s}`,
      ).join(",");
      const menu = `${menuSel}{${menuSurfaceVars(d.dark)}}`;
      return light + dark + menu;
    })
    .join("\n");
}
