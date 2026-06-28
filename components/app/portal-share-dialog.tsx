"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Share2,
  Mail,
  MessageCircle,
  Send,
  Linkedin,
  Twitter,
  Facebook,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatePortalToken } from "@/hooks/use-portal-tokens";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** Share targets — generic lucide icons + a brand tint on hover. */
interface ShareTarget {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: (url: string, text: string, title: string) => string;
  tint: string;
}

const TARGETS: ShareTarget[] = [
  {
    name: "WhatsApp",
    icon: MessageCircle,
    tint: "hover:border-[#25D366]/50 hover:text-[#25D366]",
    href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
  },
  {
    name: "Email",
    icon: Mail,
    tint: "hover:border-primary/50 hover:text-primary",
    href: (u, t, title) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${t}\n\n${u}`)}`,
  },
  {
    name: "Telegram",
    icon: Send,
    tint: "hover:border-[#229ED9]/50 hover:text-[#229ED9]",
    href: (u, t) =>
      `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    tint: "hover:border-[#0A66C2]/50 hover:text-[#0A66C2]",
    href: (u) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  },
  {
    name: "X",
    icon: Twitter,
    tint: "hover:border-foreground/40 hover:text-foreground",
    href: (u, t) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
  },
  {
    name: "Facebook",
    icon: Facebook,
    tint: "hover:border-[#1877F2]/50 hover:text-[#1877F2]",
    href: (u) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
];

/**
 * Share the branded read-only client portal: generates a secure link, then lets
 * the user copy it or share to WhatsApp / Email / Telegram / LinkedIn / X /
 * Facebook (and the OS share sheet on mobile).
 */
export function PortalShareDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}) {
  const create = useCreatePortalToken(clientId);
  const [url, setUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  React.useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const generate = React.useCallback(() => {
    setUrl(null);
    setCopied(false);
    create.mutate(
      { label: "Shared link" },
      {
        onSuccess: (res) =>
          setUrl(`${window.location.origin}/portal/${res.token}`),
        onError: (err) =>
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Couldn't create a share link",
          ),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Generate a fresh link the first time the dialog opens; reset on close.
  React.useEffect(() => {
    if (open && !url && !create.isPending) generate();
    if (!open) {
      setUrl(null);
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const title = `${clientName} — content calendar`;
  const text = `Review ${clientName}'s content calendar and approve posts:`;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Portal link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy manually");
    }
  };

  const nativeShare = async () => {
    if (!url) return;
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* user dismissed */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4 text-primary" /> Share the client portal
          </DialogTitle>
          <DialogDescription>
            A secure, branded, read-only link for{" "}
            <span className="font-medium text-foreground">{clientName}</span> to
            review &amp; approve posts — no login needed.
          </DialogDescription>
        </DialogHeader>

        {/* Link + copy */}
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={url ?? "Generating secure link…"}
            aria-label="Portal share link"
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            disabled={!url}
            onClick={copy}
            aria-label="Copy link"
          >
            {copied ? (
              <Check className="size-4 text-success" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>

        {/* Share targets */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              disabled={!url}
              className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              <Share2 className="size-5" />
              Share…
            </button>
          )}
          {TARGETS.map((t) => {
            const Icon = t.icon;
            const disabled = !url;
            return (
              <a
                key={t.name}
                href={url ? t.href(url, text, title) : undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={disabled}
                onClick={(e) => disabled && e.preventDefault()}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-xs font-medium transition-colors",
                  disabled ? "pointer-events-none opacity-50" : t.tint,
                )}
              >
                <Icon className="size-5" />
                {t.name}
              </a>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={generate}
            disabled={create.isPending}
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            New link
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!url}
            onClick={() => url && window.open(url, "_blank", "noopener")}
          >
            <ExternalLink className="size-4" /> Open portal
          </Button>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          Anyone with this link can view &amp; approve. Generate a new link to
          rotate it; old links keep working until revoked.
        </p>
      </DialogContent>
    </Dialog>
  );
}
