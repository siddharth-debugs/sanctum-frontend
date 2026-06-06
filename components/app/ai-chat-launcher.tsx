"use client";

import * as React from "react";
import {
  Sparkles,
  X,
  SendHorizontal,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxStandalone } from "@/components/app/combobox-standalone";
import { Markdown } from "@/components/app/markdown";
import { useAiChat } from "@/hooks/use-ai";
import { useProjects } from "@/hooks/use-projects";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { AiMessage } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// A tiny module-level event bus so any component (hub card, nav, etc.) can
// open the global launcher without prop-drilling a provider through the tree.
// ---------------------------------------------------------------------------
type Listener = () => void;
const listeners = new Set<Listener>();

/** Open the global AI chat panel from anywhere in the app. */
export function openAiChat() {
  listeners.forEach((l) => l());
}

const PINE_BRASS_GRADIENT =
  "linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 75%,var(--primary)))";

interface ChatTurn extends AiMessage {
  id: string;
}

/**
 * Global floating AI chat widget. Mounted ONCE in the authed app shell so it is
 * available on every page. A fixed bottom-right pine→brass sparkle button toggles
 * a chat panel (popover card on desktop, full-width bottom sheet on mobile).
 * Conversation lives in component state for the session.
 */
export function AiChatLauncher() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatTurn[]>([]);
  const [input, setInput] = React.useState("");
  const [projectId, setProjectId] = React.useState("");

  const isMobile = useIsMobile();
  const chat = useAiChat();
  const { data: projects } = useProjects();

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Subscribe to the global open bus.
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    listeners.add(onOpen);
    return () => {
      listeners.delete(onOpen);
    };
  }, []);

  // Auto-scroll to the newest message / typing indicator.
  React.useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, chat.isPending, open]);

  const projectOptions = React.useMemo(
    () => (projects ?? []).map((p) => ({ label: p.name, value: p.id })),
    [projects],
  );

  const send = React.useCallback(() => {
    const text = input.trim();
    if (!text || chat.isPending) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const history: AiMessage[] = [...messages, userTurn].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userTurn]);
    setInput("");

    chat.mutate(
      { messages: history, projectId: projectId || undefined },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: "assistant", content: res.reply },
          ]);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `e-${Date.now()}`,
              role: "assistant",
              content:
                err instanceof Error
                  ? `⚠️ ${err.message}`
                  : "⚠️ Something went wrong. Please try again.",
            },
          ]);
        },
      },
    );
  }, [input, chat, messages, projectId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div data-print-hide>
      {/* Floating launcher button */}
      {!open && (
        <button
          type="button"
          aria-label="Open AI Assistant"
          onClick={() => setOpen(true)}
          className="group fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full text-primary-foreground shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_38%,transparent)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95"
          style={{ background: PINE_BRASS_GRADIENT }}
        >
          <Sparkles className="size-6 transition-transform group-hover:rotate-12" />
        </button>
      )}

      {/* Mobile backdrop */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 animate-in fade-in-0"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="AI Assistant chat"
          className={cn(
            "glass-strong fixed z-50 flex flex-col overflow-hidden border shadow-xl animate-in fade-in-0 zoom-in-95",
            isMobile
              ? "inset-x-0 bottom-0 h-[80dvh] rounded-t-2xl slide-in-from-bottom-4"
              : "bottom-5 right-5 h-[560px] max-h-[80dvh] w-[380px] rounded-2xl slide-in-from-bottom-2",
          )}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3"
            style={{
              background:
                "linear-gradient(135deg,color-mix(in srgb,var(--primary) 12%,transparent),transparent 70%)",
            }}
          >
            <span
              className="grid size-8 place-items-center rounded-full text-primary-foreground"
              style={{ background: PINE_BRASS_GRADIENT }}
            >
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold leading-none">
                AI Assistant
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {chat.isPending ? "Thinking…" : "Ask anything about your work"}
              </p>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="New chat"
                title="New chat"
                onClick={reset}
              >
                <MessageSquarePlus className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Optional project grounding */}
          <div className="shrink-0 border-b px-3 py-2">
            <ComboboxStandalone
              value={projectId}
              onChange={setProjectId}
              options={projectOptions}
              placeholder="Ground in a project (optional)"
              emptyText="No projects."
              className="h-8 w-full text-xs"
            />
          </div>

          {/* Message list */}
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4"
          >
            {messages.length === 0 && !chat.isPending && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <span
                  className="grid size-12 place-items-center rounded-2xl text-primary-foreground"
                  style={{ background: PINE_BRASS_GRADIENT }}
                >
                  <Sparkles className="size-6" />
                </span>
                <div className="space-y-1">
                  <p className="font-display text-sm font-semibold">
                    How can I help?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Draft copy, summarize a project, plan next steps, or ask
                    anything. Press Enter to send.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-sm border bg-card px-3.5 py-2 shadow-sm">
                    <Markdown>{m.content}</Markdown>
                  </div>
                </div>
              ),
            )}

            {/* Typing indicator */}
            {chat.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border bg-card px-3.5 py-2.5 shadow-sm">
                  <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t p-3">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message the assistant…"
                rows={1}
                className="max-h-32 min-h-10 resize-none pr-11"
              />
              <Button
                type="button"
                size="icon-sm"
                aria-label="Send message"
                onClick={send}
                disabled={!input.trim() || chat.isPending}
                className="absolute bottom-1.5 right-1.5"
              >
                {chat.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
              Enter to send · Shift+Enter for a new line
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
