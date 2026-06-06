import { buildThemeCss } from "./theme-css";

/**
 * Renders one <style> containing the theme's light + dark blocks, generated
 * from theme/registry.ts. Server-rendered so there is no flash. The `:root`
 * fallback in globals.css covers the brief pre-attribute paint with Evergreen.
 */
export function ThemeStyles() {
  return (
    <style
      id="sanctum-theme-registry"
      // Deterministic CSS from the registry. suppressHydrationWarning because
      // browser extensions (ad blockers etc.) inject their own <style> into
      // <head>, shifting node positions and tripping hydration on this element.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: buildThemeCss() }}
    />
  );
}
