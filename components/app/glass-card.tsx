import * as React from "react";
import { cn } from "@/lib/utils";

/** Token-driven frosted glass surface with optional noise overlay. */
export function GlassCard({
  className,
  children,
  noise = true,
  strong = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  noise?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        "relative overflow-hidden rounded-lg",
        className,
      )}
      {...props}
    >
      {noise && <span aria-hidden className="glass-noise" />}
      <div className="relative">{children}</div>
    </div>
  );
}
