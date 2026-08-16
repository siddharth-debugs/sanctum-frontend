"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileCheck,
  ExternalLink,
  Copy,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Layers,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProposalFormSheet } from "@/components/app/proposals/proposal-form-sheet";
import {
  useProposals,
  useProposalTemplates,
  useSendProposal,
  useConvertProposalToAgreement,
} from "@/hooks/use-proposals";
import { useIsOwner } from "../session-context";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Proposal, ProposalStatus } from "@/lib/api/types";

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Draft", variant: "outline" },
  sent: { label: "Sent", variant: "secondary" },
  viewed: { label: "Viewed", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Declined", variant: "destructive" },
  converted: { label: "Converted to Agreement", variant: "default" },
  expired: { label: "Expired", variant: "outline" },
};

export default function ProposalsPage() {
  return (
    <React.Suspense fallback={null}>
      <ProposalsContent />
    </React.Suspense>
  );
}

function ProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdQuery = searchParams.get("leadId") ?? undefined;
  const isOwner = useIsOwner();

  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = React.useState(Boolean(leadIdQuery));
  const [editingProposal, setEditingProposal] = React.useState<Proposal | null>(null);

  // Send Modal State
  const [selectedProposal, setSelectedProposal] = React.useState<Proposal | null>(null);
  const [isSendOpen, setIsSendOpen] = React.useState(false);
  const [sendEmail, setSendEmail] = React.useState("");
  const [sendMessage, setSendMessage] = React.useState("");

  const { data: proposals = [], isLoading } = useProposals();
  const { data: templates = [] } = useProposalTemplates();

  const sendMutation = useSendProposal();
  const convertMutation = useConvertProposalToAgreement();

  const handleOpenCreate = () => {
    setEditingProposal(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setIsSheetOpen(true);
  };

  const handleSendProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal || !sendEmail.trim()) {
      toast.error("Recipient email is required");
      return;
    }

    try {
      await sendMutation.mutateAsync({
        proposalId: selectedProposal.id,
        recipientEmail: sendEmail.trim(),
        message: sendMessage.trim() || undefined,
      });
      toast.success(`Proposal sent to ${sendEmail.trim()}`);
      setIsSendOpen(false);
      setSelectedProposal(null);
      setSendEmail("");
      setSendMessage("");
    } catch {
      toast.error("Failed to send proposal");
    }
  };

  const handleConvertToAgreement = async (proposal: Proposal) => {
    try {
      const res = await convertMutation.mutateAsync(proposal.id);
      toast.success("Converted into Agreement successfully!");
      router.push(`/agreements?id=${res.agreementId}`);
    } catch {
      toast.error("Failed to convert proposal to agreement");
    }
  };

  const copyPublicLink = (token: string | null) => {
    if (!token) {
      toast.error("Public review link not generated yet");
      return;
    }
    const url = `${window.location.origin}/proposals/view/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Public review link copied to clipboard!");
  };

  // KPIs
  const totalCount = proposals.length;
  const acceptedCount = proposals.filter(
    (p) => p.status === "accepted" || p.status === "converted",
  ).length;
  const awaitingCount = proposals.filter(
    (p) => p.status === "sent" || p.status === "viewed",
  ).length;
  const draftCount = proposals.filter((p) => p.status === "draft").length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Commercials & Scopes"
        title="Client Proposals"
        description="Draft custom scopes with AI assistance, configure itemized deliverables, and send interactive review links."
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="size-4" /> Create Proposal
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Proposals"
          value={totalCount}
          icon={FileText}
          hint="All client proposals"
        />
        <KpiCard
          label="Accepted & Converted"
          value={acceptedCount}
          icon={CheckCircle2}
          hint="Approved by clients"
        />
        <KpiCard
          label="In Review"
          value={awaitingCount}
          icon={Clock}
          hint="Dispatched to prospects"
        />
        <KpiCard
          label="Drafts"
          value={draftCount}
          icon={Sparkles}
          hint="In-progress scopes"
        />
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <GlassCard className="p-12 text-center text-sm text-muted-foreground">
          Loading proposals...
        </GlassCard>
      ) : proposals.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-12 text-center">
          <FileText className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-display font-medium text-foreground">No proposals yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Generate an AI-assisted scope and deliverable proposal for prospective clients or active retainers.
          </p>
          <Button onClick={handleOpenCreate} className="mt-4" size="sm">
            <Plus className="size-4" /> Create Proposal
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {proposals.map((prop) => {
            const statusMeta = STATUS_CONFIG[prop.status] || STATUS_CONFIG.draft;
            const recipientName = prop.clientName || prop.leadName || "Client Account";
            const content = (prop.content as any) || {};
            const deliverablesCount = Array.isArray(content.deliverables)
              ? content.deliverables.length
              : 0;

            return (
              <GlassCard
                key={prop.id}
                className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors hover:border-primary/40"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {prop.proposalNumber || "PROP-DRAFT"}
                    </span>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    {prop.validUntil && (
                      <span className="text-xs text-muted-foreground">
                        Valid until {format(parseISO(prop.validUntil), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-base font-semibold text-foreground truncate">
                    {prop.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                      <Building2 className="size-3.5 text-primary" /> {recipientName}
                    </span>
                    {deliverablesCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Layers className="size-3 text-muted-foreground" />
                          {deliverablesCount} {deliverablesCount === 1 ? "deliverable" : "deliverables"}
                        </span>
                      </>
                    )}
                    {isOwner && (prop.totalPaise ?? 0) > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-foreground">
                          {formatINR(prop.totalPaise)}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>Created {format(parseISO(prop.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap self-end md:self-center">
                  {/* Edit Draft Button */}
                  {prop.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(prop)}
                      className="gap-1"
                    >
                      <Edit3 className="size-3.5" /> Edit Scope
                    </Button>
                  )}

                  {prop.token && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPublicLink(prop.token ?? null)}
                      title="Copy Public Review Link"
                    >
                      <Copy className="size-3.5" /> Link
                    </Button>
                  )}

                  {prop.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedProposal(prop);
                        setIsSendOpen(true);
                      }}
                    >
                      <Send className="size-3.5" /> Dispatch
                    </Button>
                  )}

                  {(prop.status === "accepted" || prop.status === "sent" || prop.status === "viewed") && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleConvertToAgreement(prop)}
                      disabled={convertMutation.isPending}
                      title="Convert to formal MSA / Legal Agreement"
                    >
                      <ShieldCheck className="size-3.5 text-emerald-500" /> Convert to Contract
                    </Button>
                  )}

                  {prop.token && (
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                      <a
                        href={`/proposals/view/${prop.token}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Full Screen View"
                      >
                        <ExternalLink className="size-4 text-muted-foreground" />
                      </a>
                    </Button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Slide-over Proposal Sidebar Sheet (Create / Edit) */}
      <ProposalFormSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        proposalToEdit={editingProposal}
        defaultLeadId={leadIdQuery}
      />

      {/* Dispatch Proposal Dialog */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Proposal to Client</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSendProposal} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Client Contact Email</Label>
              <Input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="client-decision-maker@company.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Custom Note (Optional)</Label>
              <Textarea
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                placeholder="Hi Rahul, please review our scope and deliverables estimate..."
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSendOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendMutation.isPending}>
                {sendMutation.isPending ? "Sending..." : "Send Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
