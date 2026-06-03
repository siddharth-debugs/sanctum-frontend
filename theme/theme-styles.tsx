import { buildThemeCss } from "./theme-css";

/**
 * Renders one <style> containing every theme variant x mode block, generated
 * from theme/registry.ts. Server-rendered so there is no flash. The `:root`
 * fallback in globals.css covers the brief pre-attribute paint with Bordeaux.
 */
export function ThemeStyles() {
  return (
    <style
      id="sanctum-theme-registry"
      // generated, deterministic CSS from the registry
      dangerouslySetInnerHTML={{ __html: buildThemeCss() }}
    />
  );
}
