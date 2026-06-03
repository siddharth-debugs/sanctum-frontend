import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Fixed header + fixed footer, scrollable middle.
 *
 * Parent (DialogContent / SheetContent) MUST be `flex flex-col` with a height
 * cap (max-h-[90dvh] for dialogs, h-full for sheets) and `overflow-hidden`.
 * The `min-h-0` on the body is the critical bit that lets the flex child
 * shrink and scroll instead of pushing the footer off screen.
 */
export function ScrollShell({
  header,
  footer,
  children,
  className,
  bodyClassName,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {header && (
        <div className="shrink-0 border-b px-6 py-4">{header}</div>
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-6 py-5",
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="shrink-0 border-t bg-[var(--glass-strong)] px-6 py-4 backdrop-blur">
          {footer}
        </div>
      )}
    </div>
  );
}
