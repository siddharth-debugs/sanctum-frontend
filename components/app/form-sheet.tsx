"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollShell } from "./scroll-shell";
import { cn } from "@/lib/utils";

export interface FormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Footer actions (Cancel/Submit). */
  footer: React.ReactNode;
  side?: "right" | "left";
  size?: "sm" | "md" | "lg" | "xl";
  /** When set, body is wrapped in a <form> the footer submit button can target. */
  formId?: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

const SIZE: Record<NonNullable<FormSheetProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
};

/**
 * Create/update surface in a generous right-side Sheet. Uses ScrollShell so the
 * header and footer stay fixed while the form body scrolls.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  size = "lg",
  formId,
  onSubmit,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "glass-strong flex w-full flex-col gap-0 overflow-hidden p-0",
          SIZE[size],
        )}
      >
        <ScrollShell
          header={
            <div className="space-y-1 pr-8">
              <SheetTitle className="font-display text-lg font-semibold leading-none">
                {title}
              </SheetTitle>
              {description ? (
                <SheetDescription className="text-sm text-muted-foreground">
                  {description}
                </SheetDescription>
              ) : (
                <SheetDescription className="sr-only">{title}</SheetDescription>
              )}
            </div>
          }
          footer={<div className="flex justify-end gap-2">{footer}</div>}
        >
          {formId ? (
            <form id={formId} onSubmit={onSubmit} className="space-y-5">
              {children}
            </form>
          ) : (
            <div className="space-y-5">{children}</div>
          )}
        </ScrollShell>
      </SheetContent>
    </Sheet>
  );
}
