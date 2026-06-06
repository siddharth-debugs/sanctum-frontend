"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import { formatClockTime, formatDayLabel } from "@/lib/relative-time";
import type { Message } from "@/lib/api/types";

interface Group {
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  own: boolean;
  messages: Message[];
}

interface DaySection {
  dayKey: string;
  label: string;
  groups: Group[];
}

/** Group consecutive messages by sender, split into day sections. */
function buildSections(messages: Message[], currentUserId: string): DaySection[] {
  const sections: DaySection[] = [];

  // Safety net: never render the same message id twice. A transient duplicate
  // from the optimistic-send + socket-echo race would otherwise throw React's
  // "two children with the same key" error.
  const seen = new Set<string>();
  const unique = messages.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  for (const m of unique) {
    const day = new Date(m.createdAt);
    const dayKey = Number.isNaN(day.getTime())
      ? "unknown"
      : day.toISOString().slice(0, 10);

    let section = sections[sections.length - 1];
    if (!section || section.dayKey !== dayKey) {
      section = { dayKey, label: formatDayLabel(m.createdAt), groups: [] };
      sections.push(section);
    }

    const last = section.groups[section.groups.length - 1];
    if (last && last.senderId === m.senderId) {
      last.messages.push(m);
    } else {
      section.groups.push({
        senderId: m.senderId,
        senderName: m.senderName,
        senderAvatarUrl: m.senderAvatarUrl,
        own: m.senderId === currentUserId,
        messages: [m],
      });
    }
  }

  return sections;
}

export function MessageList({
  messages,
  currentUserId,
  typingNames,
}: {
  messages: Message[];
  currentUserId: string;
  typingNames: string[];
}) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message (and when someone starts typing).
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typingNames.length]);

  const sections = React.useMemo(
    () => buildSections(messages, currentUserId),
    [messages, currentUserId],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:px-6">
      {sections.map((section) => (
        <div key={section.dayKey} className="flex flex-col gap-3">
          <div className="sticky top-0 z-10 flex justify-center">
            <span className="rounded-full bg-[color-mix(in_srgb,var(--muted)_85%,transparent)] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
              {section.label}
            </span>
          </div>

          {section.groups.map((group, gi) => (
            <div
              key={`${group.senderId}-${gi}`}
              className={cn(
                "flex items-end gap-2",
                group.own ? "flex-row-reverse" : "flex-row",
              )}
            >
              {!group.own && (
                <Avatar size="sm" className="mb-0.5 shrink-0">
                  {group.senderAvatarUrl ? (
                    <AvatarImage
                      src={group.senderAvatarUrl}
                      alt={group.senderName}
                    />
                  ) : null}
                  <AvatarFallback
                    className="text-[10px] font-semibold text-primary-foreground"
                    style={{
                      background:
                        "linear-gradient(135deg,var(--primary),var(--accent))",
                    }}
                  >
                    {initials(group.senderName)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  "flex max-w-[78%] flex-col gap-1",
                  group.own ? "items-end" : "items-start",
                )}
              >
                {!group.own && (
                  <span className="px-1 text-[11px] font-medium text-muted-foreground">
                    {group.senderName}
                  </span>
                )}
                {group.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "group/bubble flex flex-col rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                      group.own
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-[var(--muted)] text-foreground",
                      m.pending && "opacity-60",
                    )}
                  >
                    <span className="whitespace-pre-wrap break-words">
                      {m.body}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 self-end text-[10px]",
                        group.own
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {m.pending ? "Sending…" : formatClockTime(m.createdAt)}
                      {m.editedAt ? " · edited" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {typingNames.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <span className="flex gap-1">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </span>
          {typingNames.length === 1
            ? `${typingNames[0]} is typing…`
            : `${typingNames.length} people are typing…`}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
