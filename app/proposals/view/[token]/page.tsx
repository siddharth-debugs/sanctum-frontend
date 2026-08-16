"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  Award,
  ArrowRight,
  FileText,
  Check,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/app/glass-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";

export default function PublicProposalViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = React.useState(true);
  const [proposal, setProposal] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [isAcceptOpen, setIsAcceptOpen] = React.useState(false);
  const [acceptName, setAcceptName] = React.useState("");
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchProposal = async () => {
    try {
      setLoading(true);
      const res = await api<any>(`/proposals/public/${token}`);
      setProposal(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (token) {
      void fetchProposal();
    }
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptName.trim()) return;

    try {
      setSubmitting(true);
      await api(`/proposals/public/${token}/accept`, {
        method: "POST",
        body: { acceptedBy: acceptName.trim() },
      });
      toast.success("Proposal accepted! Our team has been notified.");
      setIsAcceptOpen(false);
      void fetchProposal();
    } catch {
      toast.error("Failed to accept proposal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      await api(`/proposals/public/${token}/reject`, {
        method: "POST",
        body: { reason: rejectReason.trim() || undefined },
      });
      toast.success("Proposal feedback recorded.");
      setIsRejectOpen(false);
      void fetchProposal();
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-3">
          <Sparkles className="size-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading proposal presentation...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center space-y-4 p-8">
          <XCircle className="size-12 text-destructive mx-auto" />
          <h2 className="font-display text-xl font-semibold">Proposal Unavailable</h2>
          <p className="text-sm text-muted-foreground">{error || "This proposal link is invalid or expired."}</p>
        </GlassCard>
      </div>
    );
  }

  const isAccepted = proposal.status === "accepted" || proposal.status === "converted";
  const isRejected = proposal.status === "rejected";
  const content = proposal.content || {};
  const deliverables = content.deliverables || [];
  const terms = content.terms || [];

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top Agency Branding & Document Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {proposal.agency?.name || "Sanctum Studio"}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {proposal.title}
            </h1>
            {proposal.proposalNumber && (
              <p className="text-xs font-mono text-muted-foreground">
                Document Ref: {proposal.proposalNumber}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAccepted ? (
              <Badge variant="default" className="text-xs py-1.5 px-3.5 gap-1.5 shadow-sm">
                <CheckCircle2 className="size-3.5" />
                Accepted & Approved
              </Badge>
            ) : isRejected ? (
              <Badge variant="destructive" className="text-xs py-1.5 px-3.5 gap-1.5 shadow-sm">
                <XCircle className="size-3.5" />
                Revisions Requested
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs py-1.5 px-3.5 gap-1.5 shadow-sm">
                <Clock className="size-3.5" />
                Ready for Review
              </Badge>
            )}
          </div>
        </div>

        {/* Client & Presentation Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <GlassCard className="p-4 space-y-1">
            <span className="text-muted-foreground block uppercase text-[10px] font-semibold tracking-wider">
              Prepared For
            </span>
            <span className="font-semibold text-foreground text-sm block truncate">
              {proposal.clientName || proposal.leadName || "Valued Client"}
            </span>
          </GlassCard>

          <GlassCard className="p-4 space-y-1">
            <span className="text-muted-foreground block uppercase text-[10px] font-semibold tracking-wider">
              Date Issued
            </span>
            <span className="font-semibold text-foreground text-sm block">
              {proposal.createdAt ? format(parseISO(proposal.createdAt), "MMMM d, yyyy") : "Active"}
            </span>
          </GlassCard>

          {proposal.validUntil && (
            <GlassCard className="p-4 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-muted-foreground block uppercase text-[10px] font-semibold tracking-wider">
                Offer Valid Until
              </span>
              <span className="font-semibold text-foreground text-sm block">
                {format(parseISO(proposal.validUntil), "MMMM d, yyyy")}
              </span>
            </GlassCard>
          )}
        </div>

        {/* Executive Summary & Strategic Approach */}
        {content.scopeOverview && (
          <GlassCard className="space-y-3 p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Executive Summary & Scope
              </h3>
            </div>
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
              {content.scopeOverview}
            </div>
          </GlassCard>
        )}

        {/* Deliverables & Milestone Timeline */}
        {deliverables.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                  Scope of Work & Deliverables ({deliverables.length})
                </h3>
              </div>
            </div>

            <div className="grid gap-3.5">
              {deliverables.map((del: any, idx: number) => (
                <GlassCard key={idx} className="p-5 space-y-2 relative overflow-hidden transition-all hover:border-primary/40">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                      <span className="font-display font-semibold text-base text-foreground">
                        {del.title}
                      </span>
                    </div>

                    {(del.priceRupees || del.pricePaise) && (
                      <span className="text-xs font-mono font-semibold text-foreground/80 self-start sm:self-auto bg-muted px-2.5 py-1 rounded-md">
                        {formatINR(del.pricePaise ?? (del.priceRupees * 100))}
                      </span>
                    )}
                  </div>

                  {del.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed pl-0 sm:pl-8">
                      {del.description}
                    </p>
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Commercial Investment */}
        {proposal.totalPaise > 0 && (
          <GlassCard className="p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Commercial Summary & Pricing
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Services Subtotal:</span>
                <span className="font-medium text-foreground">{formatINR(proposal.subtotalPaise)}</span>
              </div>
              {proposal.taxPaise > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Applicable GST (18%):</span>
                  <span className="font-medium text-foreground">{formatINR(proposal.taxPaise)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-lg font-bold text-foreground pt-3 border-t">
                <span>Total Commercial Investment:</span>
                <span className="text-primary">{formatINR(proposal.totalPaise)}</span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Commercial Terms & Conditions */}
        {terms.length > 0 && (
          <GlassCard className="p-6 sm:p-7 space-y-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Commercial Terms & Provisions
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {terms.map((t: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        {/* Sticky Acceptance Bar */}
        {!isAccepted && !isRejected && (
          <div className="sticky bottom-6 z-20">
            <GlassCard strong className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xl border-primary/30">
              <div className="space-y-0.5">
                <span className="font-display font-semibold text-sm text-foreground block">
                  Approve & Proceed
                </span>
                <span className="text-xs text-muted-foreground">
                  Accepting locks in the terms and prepares the formal contract.
                </span>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <Button variant="outline" size="sm" onClick={() => setIsRejectOpen(true)}>
                  Request Changes
                </Button>
                <Button size="sm" onClick={() => setIsAcceptOpen(true)} className="gap-1.5">
                  <CheckCircle2 className="size-4" /> Accept Proposal
                </Button>
              </div>
            </GlassCard>
          </div>
        )}

        {isAccepted && (
          <GlassCard className="p-7 text-center space-y-2 border-emerald-500/40 bg-emerald-500/5">
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              Proposal Formally Accepted
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Approved by <strong className="text-foreground">{proposal.acceptedBy || "Authorized Representative"}</strong> on{" "}
              {proposal.acceptedAt ? format(parseISO(proposal.acceptedAt), "PPpp") : "Record"}.
            </p>
          </GlassCard>
        )}
      </div>

      {/* Accept Modal */}
      <Dialog open={isAcceptOpen} onOpenChange={setIsAcceptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Proposal Acceptance</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAccept} className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              By confirming, you approve the deliverables and commercials outlined in this proposal.
            </p>

            <div className="space-y-1.5">
              <Label>Your Full Name</Label>
              <Input
                value={acceptName}
                onChange={(e) => setAcceptName(e.target.value)}
                placeholder="e.g. Rahul Verma"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAcceptOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Confirming..." : "Confirm & Accept"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Revisions & Feedback</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleReject} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Notes & Revisions Needed</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Let us know what adjustments are needed..."
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
