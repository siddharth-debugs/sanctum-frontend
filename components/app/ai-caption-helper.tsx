"use client";

import * as React from "react";
import { Sparkles, Loader2, Hash, Wand2, Plus, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useGenerateCaptions,
  useGenerateHashtags,
  type HashtagGroups,
} from "@/hooks/use-ai";
import { cn } from "@/lib/utils";
import { CopyButton, FallbackNote, TONE_OPTIONS } from "@/components/app/ai-shared";

type Tab = "captions" | "hashtags";

const PLATFORM_OPTIONS = [
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "X", value: "x" },
  { label: "YouTube", value: "youtube" },
  { label: "TikTok", value: "tiktok" },
];

/**
 * AI caption + hashtag assistant. Opened from the post form/modal. Generates
 * caption variations (pick one into the field) or grouped hashtags (append to
 * the field). Degrades to template output with no API key — surfaced via the
 * small fallback note, never an error.
 */
export function AiCaptionHelper({
  open,
  onOpenChange,
  caption,
  platform,
  clientId,
  onApplyCaption,
  onAppendHashtags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current caption text (used as the rewrite source / hashtag topic). */
  caption: string;
  /** First selected platform, used as the default target. */
  platform?: string;
  clientId?: string;
  /** Replace the caption field with the chosen variation. */
  onApplyCaption: (text: string) => void;
  /** Append the chosen hashtags to the caption field. */
  onAppendHashtags: (tags: string[]) => void;
}) {
  const [tab, setTab] = React.useState<Tab>("captions");
  const [brief, setBrief] = React.useState("");
  const [targetPlatform, setTargetPlatform] = React.useState(
    platform || "instagram",
  );
  const [tone, setTone] = React.useState("");

  const captions = useGenerateCaptions();
  const hashtags = useGenerateHashtags();

  const [variations, setVariations] = React.useState<string[]>([]);
  const [captionSource, setCaptionSource] = React.useState<
    "gemini" | "fallback"
  >();
  const [groups, setGroups] = React.useState<HashtagGroups | null>(null);
  const [hashtagSource, setHashtagSource] = React.useState<
    "gemini" | "fallback"
  >();
  const [picked, setPicked] = React.useState<Set<string>>(new Set());

  // Reset transient state whenever the dialog opens, seeding the brief from the
  // existing caption.
  React.useEffect(() => {
    if (open) {
      setBrief(caption.trim());
      setTargetPlatform(platform || "instagram");
      setVariations([]);
      setGroups(null);
      setPicked(new Set());
      setCaptionSource(undefined);
      setHashtagSource(undefined);
    }
  }, [open, caption, platform]);

  const hasExistingCaption = caption.trim().length > 0;

  const runCaptions = (rewrite: boolean) => {
    const text = brief.trim();
    if (!text) return;
    setVariations([]);
    setCaptionSource(undefined);
    captions.mutate(
      {
        brief: text,
        platform: targetPlatform,
        tone: tone || undefined,
        rewrite,
        clientId,
      },
      {
        onSuccess: (res) => {
          setVariations(res.variations);
          setCaptionSource(res.source);
        },
      },
    );
  };

  const runHashtags = () => {
    const text = brief.trim() || caption.trim();
    if (!text) return;
    setGroups(null);
    setHashtagSource(undefined);
    setPicked(new Set());
    hashtags.mutate(
      { topic: text, platform: targetPlatform, clientId },
      {
        onSuccess: (res) => {
          setGroups(res.groups);
          setHashtagSource(res.source);
          // Pre-select niche + branded; they're the highest-signal.
          setPicked(new Set([...res.groups.niche, ...res.groups.branded]));
        },
      },
    );
  };

  const togglePick = (tag: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const applyHashtags = () => {
    if (picked.size === 0) return;
    onAppendHashtags(Array.from(picked));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            AI caption studio
          </DialogTitle>
          <DialogDescription>
            Generate caption variations or hashtag sets and drop them straight
            into your post.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="captions" className="flex-1">
              <Wand2 className="size-3.5" aria-hidden /> Captions
            </TabsTrigger>
            <TabsTrigger value="hashtags" className="flex-1">
              <Hash className="size-3.5" aria-hidden /> Hashtags
            </TabsTrigger>
          </TabsList>

          {/* Shared controls */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Platform
              </label>
              <Select value={targetPlatform} onValueChange={setTargetPlatform}>
                <SelectTrigger className="w-full" size="sm">
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
            {tab === "captions" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tone
                </label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="w-full" size="sm">
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
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            <label htmlFor="ai-brief" className="text-xs font-medium text-muted-foreground">
              {tab === "captions" ? "Brief or caption to work from" : "Topic / caption"}
            </label>
            <Textarea
              id="ai-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={
                tab === "captions"
                  ? "Describe the post, or paste a caption to rewrite…"
                  : "What's the post about?"
              }
              rows={3}
            />
          </div>

          <TabsContent value="captions" className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => runCaptions(false)}
                disabled={!brief.trim() || captions.isPending}
              >
                {captions.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-3.5" aria-hidden />
                )}
                Write captions
              </Button>
              {hasExistingCaption && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => runCaptions(true)}
                  disabled={!brief.trim() || captions.isPending}
                >
                  <Wand2 className="size-3.5" aria-hidden /> Rewrite existing
                </Button>
              )}
            </div>

            {captions.isPending && (
              <ul className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <li
                    key={i}
                    className="h-16 animate-pulse rounded-lg border bg-muted/40"
                  />
                ))}
              </ul>
            )}

            {!captions.isPending && variations.length > 0 && (
              <div className="space-y-2">
                <FallbackNote source={captionSource} />
                <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {variations.map((v, i) => (
                    <li
                      key={i}
                      className="group rounded-lg border bg-card p-3 transition-colors hover:border-ring"
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {v}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="xs"
                          onClick={() => {
                            onApplyCaption(v);
                            onOpenChange(false);
                          }}
                        >
                          <Check className="size-3" aria-hidden /> Use this
                        </Button>
                        <CopyButton value={v} label="Copy" size="xs" variant="ghost" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hashtags" className="mt-3 space-y-3">
            <Button
              type="button"
              size="sm"
              onClick={runHashtags}
              disabled={(!brief.trim() && !caption.trim()) || hashtags.isPending}
            >
              {hashtags.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Hash className="size-3.5" aria-hidden />
              )}
              Suggest hashtags
            </Button>

            {hashtags.isPending && (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-7 w-full animate-pulse rounded bg-muted/50" />
                  </div>
                ))}
              </div>
            )}

            {!hashtags.isPending && groups && (
              <div className="space-y-3">
                <FallbackNote source={hashtagSource} />
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  <HashtagGroup
                    label="Broad reach"
                    tags={groups.broad}
                    picked={picked}
                    onToggle={togglePick}
                  />
                  <HashtagGroup
                    label="Niche"
                    tags={groups.niche}
                    picked={picked}
                    onToggle={togglePick}
                  />
                  <HashtagGroup
                    label="Branded"
                    tags={groups.branded}
                    picked={picked}
                    onToggle={togglePick}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={applyHashtags}
                  disabled={picked.size === 0}
                  className="w-full"
                >
                  <Plus className="size-3.5" aria-hidden /> Add {picked.size}{" "}
                  hashtag{picked.size === 1 ? "" : "s"} to caption
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HashtagGroup({
  label,
  tags,
  picked,
  onToggle,
}: {
  label: string;
  tags: string[];
  picked: Set<string>;
  onToggle: (tag: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isOn = picked.has(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              aria-pressed={isOn}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                isOn
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-ring",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A small "Generate captions" trigger button to place near a caption field. */
export function AiCaptionTrigger({
  onClick,
  className,
  label = "AI captions",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("gap-1.5", className)}
    >
      <Sparkles className="size-3.5 text-primary" aria-hidden />
      {label}
    </Button>
  );
}
