"use client";

import * as React from "react";
import { ThemeProvider as NextThemes } from "next-themes";
import { THEME_REGISTRY, DEFAULT_THEME } from "./registry";
import type { ThemeName } from "./types";

const VARIANT_KEY = "sanctum-theme-variant";

interface ThemeVariantContextValue {
  variant: ThemeName;
  setVariant: (v: ThemeName) => void;
}

const ThemeVariantContext = React.createContext<ThemeVariantContextValue>({
  variant: DEFAULT_THEME,
  setVariant: () => {},
});

export function useThemeVariant() {
  return React.useContext(ThemeVariantContext);
}

/**
 * Inline script (runs before paint) that reads the persisted variant from
 * localStorage and sets data-theme on <html>, avoiding a flash of the default
 * theme ("evergreen"). next-themes handles the light/dark class the same way.
 * There is only one variant now, so this effectively always sets "evergreen".
 */
function VariantScript({ forced }: { forced?: ThemeName }) {
  const js = forced
    ? `document.documentElement.setAttribute('data-theme','${forced}');`
    : `(function(){try{var v=localStorage.getItem('${VARIANT_KEY}');var allowed=${JSON.stringify(
        Object.keys(THEME_REGISTRY),
      )};if(!v||allowed.indexOf(v)===-1)v='${DEFAULT_THEME}';document.documentElement.setAttribute('data-theme',v);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

/**
 * Wraps next-themes (light/dark, default light) and adds the named-variant
 * layer (data-theme). When `forcedVariant` is set (e.g. the public portal can
 * lock to a brand theme) the switcher is bypassed.
 */
export function ThemeProvider({
  children,
  forcedVariant,
}: {
  children: React.ReactNode;
  forcedVariant?: ThemeName;
}) {
  const [variant, setVariantState] = React.useState<ThemeName>(
    forcedVariant ?? DEFAULT_THEME,
  );

  React.useEffect(() => {
    if (forcedVariant) {
      document.documentElement.setAttribute("data-theme", forcedVariant);
      return;
    }
    const saved = localStorage.getItem(VARIANT_KEY) as ThemeName | null;
    if (saved && THEME_REGISTRY[saved]) {
      setVariantState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, [forcedVariant]);

  const setVariant = React.useCallback(
    (v: ThemeName) => {
      if (forcedVariant) return;
      setVariantState(v);
      try {
        localStorage.setItem(VARIANT_KEY, v);
      } catch {
        /* ignore */
      }
      document.documentElement.setAttribute("data-theme", v);
    },
    [forcedVariant],
  );

  const value = React.useMemo(() => ({ variant, setVariant }), [variant, setVariant]);

  return (
    <NextThemes
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <VariantScript forced={forcedVariant} />
      <ThemeVariantContext.Provider value={value}>
        {children}
      </ThemeVariantContext.Provider>
    </NextThemes>
  );
}
