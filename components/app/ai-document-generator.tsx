"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  Save,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField, TextareaField } from "@/components/fields";
import type { SelectOption } from "@/components/fields";
import { Markdown } from "@/components/app/markdown";
import { useGenerateDocument } from "@/hooks/use-ai";
import { useUploadDocument } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";
import type { AiDocType, AiGeneratedDocument } from "@/lib/api/types";

const DOC_TYPE_OPTIONS: SelectOption[] = [
  { label: "SOP (Standard Operating Procedure)", value: "sop" },
  { label: "Proposal", value: "proposal" },
  { label: "Report", value: "report" },
  { label: "Handover", value: "handover" },
  { label: "Process Guide", value: "process_guide" },
  { label: "Brief", value: "brief" },
  { label: "Email", value: "email" },
];

/** Per-type placeholder coaching so the context box is genuinely useful. */
const CONTEXT_PLACEHOLDER: Record<AiDocType, string> = {
  sop: "Describe the process to document: e.g. “Onboarding a new social media client — kickoff call, asset collection, access setup, first content calendar, and the approval loop. Audience: account managers.”",
  proposal:
    "Describe the engagement: client, scope of work, deliverables, timeline, pricing model, and what makes you the right fit. e.g. “6-month retainer for a D2C skincare brand: monthly content, paid social, and reporting.”",
  report:
    "Describe what to report on: period, metrics, wins, and learnings. e.g. “Q2 performance for Acme Co — reach, engagement, follower growth, top posts, and recommendations for Q3.”",
  handover:
    "Describe what's being handed over: project/account, current status, key contacts, accounts & access, open tasks, and gotchas. e.g. “Handing off the Northwind retainer to a new account lead.”",
  process_guide:
    "Describe the workflow to explain step-by-step: e.g. “How we plan, draft, approve, and schedule a month of Instagram content — with roles and tools at each step.”",
  brief:
    "Describe the creative or campaign brief: objective, audience, key message, deliverables, tone, mandatories, and deadline. e.g. “Launch brief for a summer product drop.”",
  email:
    "Describe the email to write: recipient, goal, key points, and tone. e.g. “Follow-up to a prospect after a discovery call — recap value, propose next step, keep it warm and concise.”",
};

interface GeneratorFormValues {
  type: AiDocType;
  title: string;
  context: string;
}

export function AiDocumentGenerator({ className }: { className?: string }) {
  const generate = useGenerateDocument();
  const upload = useUploadDocument();

  const [result, setResult] = React.useState<AiGeneratedDocument | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const form = useForm<GeneratorFormValues>({
    defaultValues: { type: "sop", title: "", context: "" },
  });

  const selectedType = form.watch("type");

  const onSubmit = (values: GeneratorFormValues) => {
    if (!values.context.trim()) {
      form.setError("context", {
        message: "Add some context so the AI knows what to write.",
      });
      return;
    }
    setResult(null);
    setSaved(false);
    generate.mutate(
      {
        type: values.type,
        title: values.title.trim() || undefined,
        context: values.context.trim(),
      },
      {
        onSuccess: (doc) => {
          setResult(doc);
          toast.success("Document generated");
        },
      },
    );
  };

  const onCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const onDownload = () => {
    if (!result) return;
    const blob = new Blob([result.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(result.title)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onSave = () => {
    if (!result) return;
    // Turn the generated markdown into a .md File and reuse the existing
    // Cloudinary signed-upload flow, tagged as the ai_generated category.
    const fileName = `${safeFileName(result.title)}.md`;
    const file = new File([result.content], fileName, {
      type: "text/markdown",
    });
    upload.mutate(
      {
        file,
        name: fileName,
        category: "ai_generated",
        clientVisible: 0,
      },
      {
        onSuccess: () => {
          setSaved(true);
          toast.success("Saved to Documents");
        },
      },
    );
  };

  const loading = generate.isPending;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground"
            style={{
              background:
                "linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 75%,var(--primary)))",
            }}
          >
            <FileText className="size-5" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Document Generator
            </h2>
            <p className="text-sm text-muted-foreground">
              Turn a short brief into a polished, ready-to-share document.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <SelectField
              control={form.control}
              name="type"
              label="Document type"
              options={DOC_TYPE_OPTIONS}
              disabled={loading}
              required
            />
            <TextField
              control={form.control}
              name="title"
              label="Title"
              placeholder="Optional — we'll suggest one"
              disabled={loading}
            />
            <TextareaField
              control={form.control}
              name="context"
              label="Context / description"
              placeholder={CONTEXT_PLACEHOLDER[selectedType] ?? ""}
              rows={5}
              disabled={loading}
              required
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Generate
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Loading shimmer panel */}
        {loading && !result && (
          <div className="space-y-3 rounded-xl border bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] p-5">
            <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
          </div>
        )}

        {/* Result panel */}
        {result && (
          <div className="overflow-hidden rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] px-4 py-2.5">
              <p className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
                {result.title}
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={onCopy}>
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="size-3.5" /> Download
                </Button>
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={upload.isPending || saved}
                >
                  {upload.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : saved ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {saved ? "Saved" : "Save to Documents"}
                </Button>
              </div>
            </div>
            <div className="max-h-[480px] overflow-y-auto px-5 py-4">
              <Markdown>{result.content}</Markdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Make a safe, readable filename stem from a document title. */
function safeFileName(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "ai-document";
}
