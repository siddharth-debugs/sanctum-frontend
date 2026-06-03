"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Check, Palette } from "lucide-react";

import { useThemeVariant } from "@/theme/theme-provider";
import { THEME_LIST } from "@/theme/registry";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ align = "end" }: { align?: "start" | "end" | "center" }) {
  const { theme, setTheme } = useTheme();
  const { variant, setVariant } = useThemeVariant();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Theme settings">
          <Palette className="size-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72 glass-strong">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <div className="grid grid-cols-6 gap-2 px-2 py-2">
          {THEME_LIST.map((t) => (
            <button
              key={t.name}
              type="button"
              title={`${t.label} · ${t.vibe}`}
              onClick={() => setVariant(t.name)}
              className={cn(
                "relative h-9 w-full rounded-md border-2 border-transparent transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                variant === t.name && "border-foreground ring-2 ring-foreground/10",
              )}
              style={{ background: t.swatch }}
            >
              {variant === t.name && (
                <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
              )}
              <span className="sr-only">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="px-3 pb-1 text-[11px] text-muted-foreground">
          {THEME_LIST.find((t) => t.name === variant)?.label} ·{" "}
          {THEME_LIST.find((t) => t.name === variant)?.vibe}
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Mode
        </DropdownMenuLabel>
        <div className="flex gap-2 px-2 pb-2">
          <Button
            type="button"
            variant={!isDark ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setTheme("light")}
            disabled={!mounted}
          >
            <Sun className="size-4" /> Light
          </Button>
          <Button
            type="button"
            variant={isDark ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setTheme("dark")}
            disabled={!mounted}
          >
            <Moon className="size-4" /> Dark
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
