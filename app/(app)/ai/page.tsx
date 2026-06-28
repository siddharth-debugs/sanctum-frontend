"use client";

import Link from "next/link";
import {
  Sparkles,
  ListChecks,
  MessageCircle,
  Lightbulb,
  FileText,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiDocumentGenerator } from "@/components/app/ai-document-generator";
import { AiContentIdeas } from "@/components/app/ai-content-ideas";
import { AiRepurpose } from "@/components/app/ai-repurpose";
import { openAiChat } from "@/components/app/ai-chat-launcher";
import { PINE_BRASS_GRADIENT } from "@/components/app/ai-shared";

/** A small section divider with an icon + heading for the tool groups. */
function SectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h2>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

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
        description="Plan, write, and create — content tools for your agency, powered by AI."
      />

      {/* Top row: two quick-entry cards (chat + task breakdown). */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* AI Chat */}
        <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: PINE_BRASS_GRADIENT }}
            >
              <MessageCircle className="size-5" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                AI Chat
              </h2>
              <p className="text-sm text-muted-foreground">
                Brainstorm, draft, and get answers in a conversation. Ground it
                in a client or project for sharper, context-aware replies.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => openAiChat()} className="min-h-11">
              <Sparkles className="size-4" /> Open chat
            </Button>
            <p className="text-xs text-muted-foreground">
              Or use the sparkle button in the top bar — it&apos;s on every page.
            </p>
          </CardContent>
        </Card>

        {/* Task Breakdown */}
        <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: PINE_BRASS_GRADIENT }}
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
            <Button asChild className="min-h-11">
              <Link href="/ai/task-breakdown">
                <ListChecks className="size-4" /> Open
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Content creation tools. */}
      <SectionLabel icon={<Lightbulb className="size-4" />}>
        Content tools
      </SectionLabel>
      <div className="grid gap-4 xl:grid-cols-2">
        <AiContentIdeas />
        <AiRepurpose />
      </div>

      {/* Document generator. */}
      <SectionLabel icon={<FileText className="size-4" />}>
        Documents
      </SectionLabel>
      <AiDocumentGenerator />
    </div>
  );
}
