"use client";

import * as React from "react";
import { Recycle, Loader2, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxStandalone } from "@/components/app/combobox-standalone";
import { Markdown } from "@/components/app/markdown";
import {
  useRepurposeContent,
  type RepurposeTarget,
  type RepurposeResult,
} from "@/hooks/use-ai";
import { useClients } from "@/hooks/use-clients";
import {
  CopyButton,
  FallbackNote,
  PINE_BRASS_GRADIENT,
  TONE_OPTIONS,
} from "@/components/app/ai-shared";

const TARGET_OPTIONS: { label: string; value: RepurposeTarget }[] = [
  { label: "Instagram caption", value: "instagram" },
  { label: "LinkedIn post", value: "linkedin" },
  { label: "X (Twitter) thread", value: "x_thread" },
  { label: "Facebook post", value: "facebook" },
  { label: "TikTok script", value: "tiktok" },
  { label: "YouTube description", value: "youtube" },
  { label: "Email newsletter", value: "newsletter" },
];

export function AiRepurpose({ className }: { className?: string }) {
  const repurpose = useRepurposeContent();
  const { data: clients } = useClients();

  const [content, setContent] = React.useState("");
  const [target, setTarget] = React.useState<RepurposeTarget>("linkedin");
  const [tone, setTone] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [result, setResult] = React.useState<RepurposeResult | null>(null);

  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const loading = repurpose.isPending;
  const canSubmit = content.trim().length > 0 && !loading;

  const onSubmit = () => {
    if (!canSubmit) return;
    setResult(null);
    repurpose.mutate(
      {
        content: content.trim(),
        target,
        tone: tone || undefined,
        clientId: clientId || undefined,
      },
      { onSuccess: (res) => setResult(res) },
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground"
            style={{ background: PINE_BRASS_GRADIENT }}
          >
            <Recycle className="size-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Repurpose Content
            </h2>
            <p className="text-sm text-muted-foreground">
              Paste an existing post and adapt it for another platform — same
              message, native format.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="repurpose-src" className="text-sm font-medium">
            Source content
          </label>
          <Textarea
            id="repurpose-src"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste an Instagram caption, blog excerpt, or any post you want to adapt…"
            rows={5}
            disabled={loading}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Adapt for</label>
            <Select
              value={target}
              onValueChange={(v) => setTarget(v as RepurposeTarget)}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tone (optional)</label>
            <Select value={tone} onValueChange={setTone} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Client (optional)</label>
            <ComboboxStandalone
              value={clientId}
              onChange={setClientId}
              options={clientOptions}
              placeholder="Brand voice"
              emptyText="No clients."
              className="h-9 w-full"
              disabled={loading}
            />
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="min-h-11 w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Adapting…
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden /> Repurpose
            </>
          )}
        </Button>

        {loading && (
          <div className="space-y-3 rounded-xl border bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] p-5">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
          </div>
        )}

        {!loading && result && (
          <div className="overflow-hidden rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] px-4 py-2.5">
              <p className="min-w-0 flex-1 truncate font-display text-sm font-semibold capitalize">
                {result.targetLabel}
              </p>
              <CopyButton value={result.content} />
            </div>
            <div className="space-y-3 px-5 py-4">
              <FallbackNote source={result.source} />
              <Markdown>{result.content}</Markdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
