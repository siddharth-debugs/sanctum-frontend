"use client";

import * as React from "react";

export interface Disclosure<T> {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onOpen: (payload?: T) => void;
  onClose: () => void;
  data: T | undefined;
}

/**
 * Tiny open/close + payload helper for Sheets and Dialogs.
 *
 * Returns a STABLE object reference: it only changes identity when `open` or
 * `data` actually change (setOpen/onOpen/onClose are themselves stable). This
 * matters because consumers put the disclosure in `useMemo` dependency arrays
 * (e.g. a TanStack Table `columns` memo) — a fresh object literal every render
 * would recompute those memos and feed new `columns` into useReactTable on
 * every render, triggering the table's auto-reset state update during mount.
 */
export function useDisclosure<T = undefined>(initial = false): Disclosure<T> {
  const [open, setOpen] = React.useState(initial);
  const [data, setData] = React.useState<T | undefined>(undefined);

  const onOpen = React.useCallback((payload?: T) => {
    setData(payload);
    setOpen(true);
  }, []);

  const onClose = React.useCallback(() => setOpen(false), []);

  return React.useMemo<Disclosure<T>>(
    () => ({ open, setOpen, onOpen, onClose, data }),
    [open, data, onOpen, onClose],
  );
}
