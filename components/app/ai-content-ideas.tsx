"use client";

import * as React from "react";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxStandalone } from "@/components/app/combobox-standalone";
import {
  useGenerateContentIdeas,
  type ContentIdea,
} from "@/hooks/use-ai";
import { useClients } from "@/hooks/use-clients";
import {
  CopyButton,
  FallbackNote,
  PINE_BRASS_GRADIENT,
  PLATFORM_OPTIONS,
} from "@/components/app/ai-shared";

const COUNT_OPTIONS = ["4", "6", "8", "10"];

const FORMAT_TONE: Record<string, string> = {
  reel: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  carousel: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  story: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  post: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  live: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
};

export function AiContentIdeas({ className }: { className?: string }) {
  const generate = useGenerateContentIdeas();
  const { data: clients } = useClients();

  const [niche, setNiche] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [platform, setPlatform] = React.useState("instagram");
  const [count, setCount] = React.useState("6");
  const [ideas, setIdeas] = React.useState<ContentIdea[]>([]);
  const [source, setSource] = React.useState<"gemini" | "fallback">();

  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const loading = generate.isPending;
  const canSubmit = (niche.trim() || clientId) && !loading;

  const onGenerate = () => {
    if (!canSubmit) return;
    setIdeas([]);
    setSource(undefined);
    generate.mutate(
      {
        niche: niche.trim() || "this brand",
        clientId: clientId || undefined,
        platform,
        count: Number(count),
      },
      {
        onSuccess: (res) => {
          setIdeas(res.ideas);
          setSource(res.source);
        },
      },
    );
  };

  const allText = React.useMemo(
    () =>
      ideas
        .map((i) => `• ${i.hook} [${i.format}] — ${i.rationale}`)
        .join("\n"),
    [ideas],
  );

  return (
    <Card className={className}>
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground"
            style={{ background: PINE_BRASS_GRADIENT }}
          >
            <Lightbulb className="size-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Content Ideas
            </h2>
            <p className="text-sm text-muted-foreground">
              Brainstorm a batch of post ideas for a client or niche — each with
              a hook, format, and why it works.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="ideas-niche" className="text-sm font-medium">
              Niche or topic
            </label>
            <Input
              id="ideas-niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. sustainable skincare, B2B SaaS onboarding…"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") onGenerate();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Client (optional)</label>
            <ComboboxStandalone
              value={clientId}
              onChange={setClientId}
              options={clientOptions}
              placeholder="Ground in a client"
              emptyText="No clients."
              className="h-9 w-full"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Platform</label>
              <Select
                value={platform}
                onValueChange={setPlatform}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">How many</label>
              <Select value={count} onValueChange={setCount} disabled={loading}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNT_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} ideas
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button
          onClick={onGenerate}
          disabled={!canSubmit}
          className="min-h-11 w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Brainstorming…
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden /> Generate ideas
            </>
          )}
        </Button>

        {/* Loading skeleton */}
        {loading && (
          <ul className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="space-y-2 rounded-xl border bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] p-4"
              >
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </li>
            ))}
          </ul>
        )}

        {/* Results */}
        {!loading && ideas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <FallbackNote source={source} className="flex-1" />
              <CopyButton value={allText} label="Copy all" className="shrink-0" />
            </div>
            <ul className="space-y-2.5">
              {ideas.map((idea, i) => (
                <li
                  key={i}
                  className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium leading-snug">{idea.hook}</p>
                      <Badge
                        variant="outline"
                        className={
                          FORMAT_TONE[idea.format] ?? "bg-muted text-muted-foreground"
                        }
                      >
                        {idea.format}
                      </Badge>
                    </div>
                    {idea.rationale && (
                      <p className="text-sm text-muted-foreground">
                        {idea.rationale}
                      </p>
                    )}
                  </div>
                  <CopyButton
                    value={idea.hook}
                    label="Copy"
                    variant="ghost"
                    size="xs"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
