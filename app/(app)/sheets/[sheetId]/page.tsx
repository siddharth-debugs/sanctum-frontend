"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetEditor } from "@/components/app/sheets/sheet-editor";
import { useSheet } from "@/hooks/use-sheets";

export default function SheetEditorPage() {
  const params = useParams<{ sheetId: string }>();
  const router = useRouter();
  const sheetId = params.sheetId;
  const { data, isLoading, error } = useSheet(sheetId);

  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load this sheet.
        </p>
        <Button variant="outline" onClick={() => router.push("/sheets")}>
          <ArrowLeft className="size-4" /> Back to Sheets
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="min-h-0 flex-1 w-full rounded-md" />
      </div>
    );
  }

  // Remount the editor when the sheet id changes so its local working copy
  // re-seeds cleanly (no cross-sheet bleed).
  return <SheetEditor key={data.id} sheet={data} />;
}
