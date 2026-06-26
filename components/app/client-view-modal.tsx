"use client";

import Link from "next/link";
import { CalendarDays, Pencil, ExternalLink } from "lucide-react";

import { ViewModal } from "@/components/app/view-modal";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/lib/api/types";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function ClientViewModal({
  open,
  onOpenChange,
  client,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onEdit?: (client: Client) => void;
}) {
  if (!client) return null;

  return (
    <ViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={client.name}
      description={
        client.status === "active" ? "Active client" : "Archived client"
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild variant="outline">
            <Link href={`/clients/${client.id}/calendar`}>
              <CalendarDays className="size-4" /> Calendar
            </Link>
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(client)}>
              <Pencil className="size-4" /> Edit
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{
            background: client.brandColor
              ? `color-mix(in srgb, ${client.brandColor} 8%, transparent)`
              : undefined,
          }}
        >
          <span
            className="grid size-12 place-items-center rounded-xl text-lg font-bold text-white"
            style={{
              background: client.brandColor ?? "var(--primary)",
            }}
          >
            {client.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div className="font-display text-lg font-semibold">
              {client.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {client.contactEmail ?? "No contact email"}
            </div>
          </div>
          <span
            className={
              "ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold " +
              (client.status === "active"
                ? "text-success bg-[color-mix(in_srgb,var(--success)_15%,transparent)]"
                : "text-muted-foreground bg-muted")
            }
          >
            {client.status === "active" ? "Active" : "Archived"}
          </span>
        </div>

        <div>
          <DetailRow label="Status">
            {client.status === "active" ? "Active" : "Archived"}
          </DetailRow>
          <DetailRow label="Brand color">
            {client.brandColor ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-3.5 rounded-full border"
                  style={{ background: client.brandColor }}
                />
                {client.brandColor}
              </span>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Portal statuses">
            {client.portalVisibleStatuses.length}
          </DetailRow>
          <DetailRow label="Created">{formatDate(client.createdAt)}</DetailRow>
        </div>

        {(() => {
          const handles = Object.entries(client.handles ?? {}).filter(
            ([k]) => k !== "sector",
          );
          if (handles.length === 0) return null;
          return (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Handles
              </div>
              <div className="flex flex-wrap gap-2">
                {handles.map(([platform, handle]) => (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    <ExternalLink className="size-3" />
                    {handle}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </ViewModal>
  );
}
