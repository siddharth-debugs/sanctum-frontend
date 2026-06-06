"use client";

import Link from "next/link";
import { Sparkles, ListChecks, MessageCircle } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiDocumentGenerator } from "@/components/app/ai-document-generator";
import { openAiChat } from "@/components/app/ai-chat-launcher";

export default function AiHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <Sparkles className="size-3" /> AI Assistant
          </>
        }
        title="AI Assistant"
        description="Plan, write, and manage — powered by AI."
      />

      {/* Top row: two quick-entry cards. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Task Breakdown */}
        <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 75%,var(--primary)))",
              }}
            >
              <ListChecks className="size-5" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Task Breakdown
              </h2>
              <p className="text-sm text-muted-foreground">
                Plan a project end-to-end — milestones, tasks, and bulk paste to
                turn a brain-dump into a structured board.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/ai/task-breakdown">
                <ListChecks className="size-4" /> Open
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* AI Chat */}
        <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-primary-foreground"
              style={{
                background:
                  "linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 75%,var(--primary)))",
              }}
            >
              <MessageCircle className="size-5" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                AI Chat
              </h2>
              <p className="text-sm text-muted-foreground">
                Brainstorm, draft, and get answers in a conversation. Ground it in
                a project for sharper, context-aware replies.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => openAiChat()}>
              <Sparkles className="size-4" /> Open chat
            </Button>
            <p className="text-xs text-muted-foreground">
              Or use the sparkle button, bottom-right — it&apos;s on every page.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Document Generator — full width, renders its result inline. */}
      <AiDocumentGenerator />
    </div>
  );
}
