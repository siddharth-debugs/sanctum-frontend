"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Building2,
  Calendar,
  Sparkles,
  Award,
  FileCheck,
  Edit3,
  Scale,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AgreementFormSheet } from "@/components/app/agreements/agreement-form-sheet";
import {
  useAgreements,
  useAgreementTemplates,
  useSendAgreement,
} from "@/hooks/use-agreements";
import { useIsOwner } from "../session-context";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Agreement, AgreementStatus } from "@/lib/api/types";

const STATUS_CONFIG: Record<
  AgreementStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Draft", variant: "outline" },
  sent: { label: "Sent for Signature", variant: "secondary" },
  signed: { label: "Signed & Active", variant: "default" },
  active: { label: "Active", variant: "default" },
  terminated: { label: "Terminated", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
};

export default function AgreementsPage() {
  return (
    <React.Suspense fallback={null}>
      <AgreementsContent />
    </React.Suspense>
  );
}

function AgreementsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id") ?? undefined;
  const isOwner = useIsOwner();

  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingAgreement, setEditingAgreement] = React.useState<Agreement | null>(null);

  // Send Modal State
  const [selectedAgreement, setSelectedAgreement] = React.useState<Agreement | null>(null);
  const [isSendOpen, setIsSendOpen] = React.useState(false);
  const [sendEmail, setSendEmail] = React.useState("");
  const [sendMessage, setSendMessage] = React.useState("");
  const [viewAuditModal, setViewAuditModal] = React.useState<Agreement | null>(null);

  const { data: agreements = [], isLoading } = useAgreements();
  const { data: templates = [] } = useAgreementTemplates();

  const sendMutation = useSendAgreement();

  const handleOpenCreate = () => {
    setEditingAgreement(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (agreement: Agreement) => {
    setEditingAgreement(agreement);
    setIsSheetOpen(true);
  };

  const handleSendAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreement || !sendEmail.trim()) {
      toast.error("Recipient email is required");
      return;
    }

    try {
      await sendMutation.mutateAsync({
        agreementId: selectedAgreement.id,
        recipientEmail: sendEmail.trim(),
        message: sendMessage.trim() || undefined,
      });
      toast.success(`Agreement dispatched for signing to ${sendEmail.trim()}`);
      setIsSendOpen(false);
      setSelectedAgreement(null);
      setSendEmail("");
      setSendMessage("");
    } catch {
      toast.error("Failed to send agreement");
    }
  };

  const copySignLink = (token: string | null) => {
    if (!token) {
      toast.error("Signing token not generated yet");
      return;
    }
    const url = `${window.location.origin}/agreements/sign/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Digital Signing link copied to clipboard!");
  };

  // KPIs
  const totalCount = agreements.length;
  const activeCount = agreements.filter((a) => a.status === "signed" || a.status === "active").length;
  const pendingCount = agreements.filter((a) => a.status === "sent").length;
  const draftCount = agreements.filter((a) => a.status === "draft").length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Legal & Contracts"
        title="Agreements & Contracts"
        description="Draft Master Services Agreements (MSAs), retainers, and SOWs with AI legal copilot. Send for legally binding digital e-signatures."
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="size-4" /> Create Agreement
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Contracts"
          value={totalCount}
          icon={FileCheck}
          hint="All agency agreements"
        />
        <KpiCard
          label="Active & Signed"
          value={activeCount}
          icon={ShieldCheck}
          hint="Fully executed agreements"
        />
        <KpiCard
          label="Awaiting Signature"
          value={pendingCount}
          icon={Clock}
          hint="Dispatched to client"
        />
        <KpiCard
          label="Draft Contracts"
          value={draftCount}
          icon={Sparkles}
          hint="In-progress drafting"
        />
      </div>

      {/* Agreements List */}
      {isLoading ? (
        <GlassCard className="p-12 text-center text-sm text-muted-foreground">
          Loading contracts...
        </GlassCard>
      ) : agreements.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-12 text-center">
          <ShieldCheck className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-display font-medium text-foreground">No agreements generated yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Generate an MSA, Retainer agreement, or Statement of Work for client digital signature.
          </p>
          <Button onClick={handleOpenCreate} className="mt-4" size="sm">
            <Plus className="size-4" /> Create Agreement
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {agreements.map((agr) => {
            const statusMeta = STATUS_CONFIG[agr.status] || STATUS_CONFIG.draft;
            const isTarget = agr.id === highlightId;
            const terms = (agr.terms as any) || {};
            const clausesCount = Array.isArray(terms.clauses) ? terms.clauses.length : 0;

            return (
              <GlassCard
                key={agr.id}
                className={cn(
                  "p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors hover:border-primary/40",
                  isTarget && "border-primary ring-1 ring-primary/40",
                )}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {agr.agreementNumber || "AGR-DRAFT"}
                    </span>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    {agr.effectiveDate && (
                      <span className="text-xs text-muted-foreground">
                        Effective {format(parseISO(agr.effectiveDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-base font-semibold text-foreground truncate">
                    {agr.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                      <Building2 className="size-3.5 text-primary" /> {agr.clientName || "Client"}
                    </span>
                    {clausesCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Scale className="size-3 text-muted-foreground" />
                          {clausesCount} {clausesCount === 1 ? "clause" : "clauses"}
                        </span>
                      </>
                    )}
                    {isOwner && (agr.retainerPaise ?? 0) > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-foreground">
                          {formatINR(agr.retainerPaise)}/mo retainer
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap self-end md:self-center">
                  {/* Edit Draft Button */}
                  {agr.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(agr)}
                      className="gap-1"
                    >
                      <Edit3 className="size-3.5" /> Edit Contract
                    </Button>
                  )}

                  {agr.token && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copySignLink(agr.token ?? null)}
                      title="Copy Digital Signing Link"
                    >
                      <Copy className="size-3.5" /> Sign Link
                    </Button>
                  )}

                  {agr.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAgreement(agr);
                        setIsSendOpen(true);
                      }}
                    >
                      <Send className="size-3.5" /> Dispatch
                    </Button>
                  )}

                  {agr.status === "signed" && agr.signatureDataUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setViewAuditModal(agr)}
                    >
                      <Award className="size-3.5 text-emerald-500" /> Certificate
                    </Button>
                  )}

                  {agr.token && (
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                      <a
                        href={`/agreements/sign/${agr.token}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Sign Page"
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

      {/* Slide-over Agreement Sidebar Sheet (Create / Edit) */}
      <AgreementFormSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        agreementToEdit={editingAgreement}
      />

      {/* Dispatch Agreement Dialog */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send for Digital Signature</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSendAgreement} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Signer Email Address</Label>
              <Input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="authorized-signatory@company.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Note to Signer (Optional)</Label>
              <Textarea
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                placeholder="Please review and e-sign the attached contract..."
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSendOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendMutation.isPending}>
                {sendMutation.isPending ? "Sending..." : "Dispatch for Signing"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Certificate Viewer Modal */}
      {viewAuditModal && (
        <Dialog open={Boolean(viewAuditModal)} onOpenChange={() => setViewAuditModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="size-5 text-emerald-500" /> Digital Certificate of Execution
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 rounded-xl border bg-muted/30 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Number:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {viewAuditModal.agreementNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signer Name:</span>
                  <span className="font-semibold text-foreground">{viewAuditModal.signerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signer Email:</span>
                  <span className="text-foreground">{viewAuditModal.signerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signer IP Address:</span>
                  <span className="font-mono text-foreground">{viewAuditModal.signerIp || "Verified Secure"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Execution Timestamp:</span>
                  <span className="text-foreground">
                    {viewAuditModal.signedAt
                      ? format(parseISO(viewAuditModal.signedAt), "PPpp")
                      : "Completed"}
                  </span>
                </div>
              </div>

              {viewAuditModal.signatureDataUrl && (
                <div className="space-y-1.5">
                  <Label>Digital Signature Capture</Label>
                  <div className="p-4 rounded-xl border bg-card flex items-center justify-center min-h-[100px]">
                    <img
                      src={viewAuditModal.signatureDataUrl}
                      alt="Digital Signature"
                      className="max-h-20 object-contain dark:invert"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setViewAuditModal(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
