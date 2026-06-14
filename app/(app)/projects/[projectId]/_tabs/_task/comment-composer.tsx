"use client";

import * as React from "react";
import { CornerDownLeft, Send } from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface MentionMember {
  id: string;
  name: string;
}

export interface CommentComposerProps {
  members: MentionMember[];
  disabled?: boolean;
  pending?: boolean;
  /** Submit the comment body plus the resolved mention userIds. */
  onSubmit: (body: string, mentions: string[]) => void;
}

/** Find the `@token` immediately left of the caret, if any. */
function activeMention(
  text: string,
  caret: number,
): { query: string; start: number } | null {
  const upto = text.slice(0, caret);
  const match = /(?:^|\s)@([\w-]*)$/.exec(upto);
  if (!match) return null;
  const query = match[1];
  const start = caret - query.length - 1; // position of the '@'
  return { query, start };
}

/** A display name → @token (spaces stripped) so the body round-trips mentions. */
function mentionToken(name: string): string {
  return name.replace(/\s+/g, "");
}

/**
 * Comment composer with @mention autocomplete (spec §4.1). Typing `@` opens a
 * member picker filtered live by the typed query; choosing a member inserts an
 * `@Name` token and records the userId. Cmd/Ctrl+Enter (or the Send button)
 * submits; the textarea auto-grows. Empty bodies are blocked. Resolved mentions
 * are de-duped against the final body so deleting a token drops the mention.
 */
export function CommentComposer({
  members,
  disabled,
  pending,
  onSubmit,
}: CommentComposerProps) {
  const [body, setBody] = React.useState("");
  // Map of token → userId for everyone the author has @-picked.
  const [picked, setPicked] = React.useState<Map<string, string>>(new Map());
  const [mentionState, setMentionState] = React.useState<{
    query: string;
    start: number;
  } | null>(null);
  const [highlight, setHighlight] = React.useState(0);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const matches = React.useMemo(() => {
    if (!mentionState) return [];
    const q = mentionState.query.toLowerCase();
    return members
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionState, members]);

  React.useEffect(() => setHighlight(0), [mentionState?.query]);

  function syncMention(text: string, caret: number) {
    setMentionState(activeMention(text, caret));
  }

  function choose(member: MentionMember) {
    if (!mentionState || !ref.current) return;
    const token = mentionToken(member.name);
    const el = ref.current;
    const caret = el.selectionStart ?? body.length;
    const before = body.slice(0, mentionState.start);
    const after = body.slice(caret);
    const inserted = `@${token} `;
    const next = `${before}${inserted}${after}`;
    setBody(next);
    setPicked((prev) => new Map(prev).set(token, member.id));
    setMentionState(null);
    // Restore caret just after the inserted token on the next tick.
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  /** Resolve mention userIds for the tokens that still survive in `body`. */
  function resolveMentions(text: string): string[] {
    const ids = new Set<string>();
    for (const [token, id] of picked) {
      if (new RegExp(`@${token}\\b`).test(text)) ids.add(id);
    }
    return Array.from(ids);
  }

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || pending || disabled) return;
    onSubmit(trimmed, resolveMentions(trimmed));
    setBody("");
    setPicked(new Map());
    setMentionState(null);
  }

  const canSubmit = body.trim().length > 0 && !pending && !disabled;

  return (
    <div className="relative">
      <div className="rounded-lg border bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
        <Textarea
          ref={ref}
          value={body}
          disabled={disabled}
          aria-label="Write a comment"
          placeholder="Write a comment…  Use @ to mention a teammate."
          onChange={(e) => {
            setBody(e.target.value);
            syncMention(e.target.value, e.target.selectionStart ?? 0);
          }}
          onClick={(e) =>
            syncMention(
              e.currentTarget.value,
              e.currentTarget.selectionStart ?? 0,
            )
          }
          onKeyDown={(e) => {
            if (mentionState && matches.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => (h + 1) % matches.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => (h - 1 + matches.length) % matches.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                choose(matches[highlight]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setMentionState(null);
                return;
              }
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          className="min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-2">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
            <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1 font-sans text-[0.65rem]">
              <CornerDownLeft className="size-2.5" aria-hidden />
            </kbd>
            <span>Cmd+Enter to send</span>
          </span>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={!canSubmit}
            className="ml-auto"
          >
            <Send className="size-3.5" />
            {pending ? "Sending…" : "Comment"}
          </Button>
        </div>
      </div>

      {/* @mention autocomplete */}
      {mentionState && matches.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention a teammate"
          className="absolute bottom-full left-0 z-20 mb-1 max-h-56 w-64 overflow-auto rounded-lg border bg-popover p-1 shadow-md"
        >
          {matches.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(m);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150",
                  i === highlight ? "bg-accent/15 text-foreground" : "",
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback className="text-[10px]">
                    {initials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
