"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollShell } from "./scroll-shell";
import { cn } from "@/lib/utils";

export interface ViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const DSIZE = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
} as const;

/**
 * Read-a-record surface in a centered Dialog. Shares ScrollShell with FormSheet
 * so the fixed-header / scroll-body / fixed-footer behaviour is identical.
 */
export function ViewModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: ViewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "glass-strong flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0",
          DSIZE[size],
        )}
      >
        <ScrollShell
          header={
            <div className="space-y-1 pr-8">
              <DialogTitle className="font-display text-lg font-semibold leading-none">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-sm text-muted-foreground">
                  {description}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{title}</DialogDescription>
              )}
            </div>
          }
          footer={
            footer ? <div className="flex justify-end gap-2">{footer}</div> : undefined
          }
        >
          {children}
        </ScrollShell>
      </DialogContent>
    </Dialog>
  );
}
