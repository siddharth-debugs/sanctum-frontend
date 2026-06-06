"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import type { Participant } from "@/lib/api/types";

/** Overlapping avatar stack for a thread's participants. */
export function ParticipantAvatars({
  participants,
  max = 3,
  size = "sm",
  className,
}: {
  participants: Participant[];
  max?: number;
  size?: "sm" | "default";
  className?: string;
}) {
  const shown = participants.slice(0, max);
  const extra = participants.length - shown.length;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {shown.map((p) => (
        <Avatar
          key={p.userId}
          size={size}
          className="ring-2 ring-[var(--card)]"
        >
          {p.avatarUrl ? (
            <AvatarImage src={p.avatarUrl} alt={p.name} />
          ) : null}
          <AvatarFallback
            className="text-[10px] font-semibold text-primary-foreground"
            style={{
              background:
                "linear-gradient(135deg,var(--primary),var(--accent))",
            }}
          >
            {initials(p.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "grid place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-[var(--card)]",
            size === "sm" ? "size-6" : "size-8",
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
