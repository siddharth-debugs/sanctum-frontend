"use client";

import * as React from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { useUpdateDocument } from "@/hooks/use-documents";
import { ApiError } from "@/lib/api/client";
import type { Document } from "@/lib/api/types";

/** Inline Switch that PATCHes a document's clientVisible flag (optimistic-ish). */
export function DocumentVisibleToggle({ doc }: { doc: Document }) {
  const update = useUpdateDocument();
  const [checked, setChecked] = React.useState(doc.clientVisible === 1);

  React.useEffect(() => {
    setChecked(doc.clientVisible === 1);
  }, [doc.clientVisible]);

  return (
    <Switch
      checked={checked}
      disabled={update.isPending}
      onClick={(e) => e.stopPropagation()}
      onCheckedChange={(next) => {
        setChecked(next);
        update.mutate(
          { id: doc.id, patch: { clientVisible: next ? 1 : 0 } },
          {
            onError: (err) => {
              setChecked(!next); // revert
              toast.error(
                err instanceof ApiError ? err.message : "Couldn't update",
              );
            },
          },
        );
      }}
      aria-label="Visible to client"
    />
  );
}
