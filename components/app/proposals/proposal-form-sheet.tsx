"use client";

import * as React from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Building2,
  UserCheck,
  Calendar,
  DollarSign,
  Wand2,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { FormSheet } from "@/components/app/form-sheet";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateProposal,
  useUpdateProposal,
  useProposalTemplates,
  useGenerateAiProposal,
  useEnhanceAiProposal,
} from "@/hooks/use-proposals";
import { useClients } from "@/hooks/use-clients";
import { useLeads } from "@/hooks/use-leads";
import { useIsOwner } from "@/app/(app)/session-context";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";
import type { Proposal } from "@/lib/api/types";

export interface ProposalFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalToEdit?: Proposal | null;
  defaultLeadId?: string;
  defaultClientId?: string;
}

interface DeliverableDraft {
  id: string;
  title: string;
  description: string;
  priceRupees: string;
}

export function ProposalFormSheet({
  open,
  onOpenChange,
  proposalToEdit,
  defaultLeadId,
  defaultClientId,
}: ProposalFormSheetProps) {
  const isOwner = useIsOwner();
  const isEditing = Boolean(proposalToEdit);

  // Form State
  const [recipientType, setRecipientType] = React.useState<"client" | "lead">("client");
  const [clientId, setClientId] = React.useState<string>("");
  const [leadId, setLeadId] = React.useState<string>("");
  const [templateId, setTemplateId] = React.useState<string>("none");
  const [title, setTitle] = React.useState<string>("");
  const [validUntil, setValidUntil] = React.useState<string>("");
  const [scopeOverview, setScopeOverview] = React.useState<string>("");

  const [deliverables, setDeliverables] = React.useState<DeliverableDraft[]>([
    {
      id: "del-1",
      title: "Strategic Discovery & Brand Architecture",
      description: "In-depth audit, user personas, brand positioning, and milestone delivery plan.",
      priceRupees: "40000",
    },
    {
      id: "del-2",
      title: "Design System & Digital Production",
      description: "High-fidelity mockups, responsive components, and cross-platform asset library.",
      priceRupees: "50000",
    },
  ]);

  const [terms, setTerms] = React.useState<string[]>([
    "Intellectual Property: Client owns all produced assets upon final milestone payment.",
    "Revisions: Includes up to 2 rounds of stakeholder revisions per milestone.",
    "Payment Schedule: 50% mobilization advance, 50% upon final sign-off.",
    "Validity: Commercial estimates valid for 30 calendar days from issue date.",
  ]);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = React.useState<string>("");

  // Data Queries & Mutations
  const { data: templates = [] } = useProposalTemplates();
  const { data: clients = [] } = useClients();
  const { data: leads = [] } = useLeads();

  const createMutation = useCreateProposal();
  const updateMutation = useUpdateProposal();
  const aiGenerateMutation = useGenerateAiProposal();
  const aiEnhanceMutation = useEnhanceAiProposal();

  // Populate form on edit / open
  React.useEffect(() => {
    if (proposalToEdit) {
      setTitle(proposalToEdit.title || "");
      if (proposalToEdit.clientId) {
        setRecipientType("client");
        setClientId(proposalToEdit.clientId);
        setLeadId("");
      } else if (proposalToEdit.leadId) {
        setRecipientType("lead");
        setLeadId(proposalToEdit.leadId);
        setClientId("");
      }

      if (proposalToEdit.validUntil) {
        setValidUntil(proposalToEdit.validUntil.split("T")[0]);
      } else {
        setValidUntil("");
      }

      const content = (proposalToEdit.content as any) || {};
      setScopeOverview(content.scopeOverview || content.overview || "");

      if (Array.isArray(content.deliverables) && content.deliverables.length) {
        setDeliverables(
          content.deliverables.map((d: any, idx: number) => ({
            id: `del-${idx}-${Date.now()}`,
            title: d.title || "Deliverable",
            description: d.description || "",
            priceRupees: d.priceRupees ? String(d.priceRupees) : (d.pricePaise ? String(Math.round(d.pricePaise / 100)) : "0"),
          })),
        );
      }

      if (Array.isArray(content.terms) && content.terms.length) {
        setTerms(content.terms);
      }
    } else {
      // Default reset
      if (defaultLeadId) {
        setRecipientType("lead");
        setLeadId(defaultLeadId);
        setClientId("");
      } else if (defaultClientId) {
        setRecipientType("client");
        setClientId(defaultClientId);
        setLeadId("");
      } else {
        setRecipientType("client");
        setClientId(clients[0]?.id || "");
        setLeadId("");
      }

      setTitle("");
      setTemplateId("none");
      setValidUntil(
        new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      );
      setScopeOverview("");
      setAiPrompt("");
      setDeliverables([
        {
          id: "del-1",
          title: "Strategic Discovery & Brand Architecture",
          description: "In-depth audit, user personas, brand positioning, and milestone delivery plan.",
          priceRupees: "40000",
        },
        {
          id: "del-2",
          title: "Design System & Digital Production",
          description: "High-fidelity mockups, responsive components, and cross-platform asset library.",
          priceRupees: "50000",
        },
      ]);
      setTerms([
        "Intellectual Property: Client owns all produced assets upon final milestone payment.",
        "Revisions: Includes up to 2 rounds of stakeholder revisions per milestone.",
        "Payment Schedule: 50% mobilization advance, 50% upon final sign-off.",
        "Validity: Commercial estimates valid for 30 calendar days from issue date.",
      ]);
    }
  }, [proposalToEdit, defaultLeadId, defaultClientId, open]);

  // Handle Template selection
  const handleTemplateSelect = (tplId: string) => {
    setTemplateId(tplId);
    if (tplId === "none") return;
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setTitle(tpl.name);
      const c = tpl.content as any;
      if (c?.scopeOverview) setScopeOverview(c.scopeOverview);
      if (Array.isArray(c?.deliverables)) {
        setDeliverables(
          c.deliverables.map((d: any, idx: number) => ({
            id: `del-tpl-${idx}`,
            title: d.title || "Deliverable",
            description: d.description || "",
            priceRupees: d.priceRupees ? String(d.priceRupees) : "25000",
          })),
        );
      }
      if (Array.isArray(c?.terms)) {
        setTerms(c.terms);
      }
    }
  };

  // AI Proposal Generation
  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a brief description for AI generation");
      return;
    }

    try {
      let clientName = "";
      if (recipientType === "client") {
        clientName = clients.find((c) => c.id === clientId)?.name || "";
      } else {
        clientName = leads.find((l) => l.id === leadId)?.name || "";
      }

      const res = await aiGenerateMutation.mutateAsync({
        prompt: aiPrompt.trim(),
        clientName: clientName || undefined,
        deliverablesCount: 4,
      });

      setTitle(res.title);
      setScopeOverview(res.overview);
      if (res.deliverables && res.deliverables.length) {
        setDeliverables(
          res.deliverables.map((d, idx) => ({
            id: `del-ai-${idx}-${Date.now()}`,
            title: d.title,
            description: d.description,
            priceRupees: d.priceRupees ? String(d.priceRupees) : "35000",
          })),
        );
      }
      if (res.terms && res.terms.length) {
        setTerms(res.terms);
      }

      toast.success(
        res.source === "gemini"
          ? "Proposal draft generated with Gemini AI!"
          : "Proposal draft generated from agency knowledge base!",
      );
    } catch {
      toast.error("Failed to generate proposal with AI");
    }
  };

  // AI Scope Polish
  const handlePolishScope = async () => {
    if (!scopeOverview.trim()) {
      toast.error("Please write some scope text first to polish");
      return;
    }

    try {
      const res = await aiEnhanceMutation.mutateAsync({
        text: scopeOverview,
        context: "Client Proposal Scope & Strategy",
        instruction: "Make it more professional, structured, and compelling for agency clients.",
      });
      setScopeOverview(res.enhancedText);
      toast.success("Scope refined with AI!");
    } catch {
      toast.error("Failed to refine scope");
    }
  };

  // AI Deliverable Polish
  const handlePolishDeliverable = async (id: string) => {
    const item = deliverables.find((d) => d.id === id);
    if (!item || !item.description.trim()) return;

    try {
      const res = await aiEnhanceMutation.mutateAsync({
        text: item.description,
        context: `Deliverable: ${item.title}`,
        instruction: "Make the deliverable milestone description crisp, detailed, and result-oriented.",
      });
      setDeliverables((prev) =>
        prev.map((d) => (d.id === id ? { ...d, description: res.enhancedText } : d)),
      );
      toast.success("Deliverable description enhanced!");
    } catch {
      toast.error("Failed to enhance deliverable");
    }
  };

  // Deliverables manipulation
  const addDeliverable = () => {
    setDeliverables((prev) => [
      ...prev,
      {
        id: `del-${Date.now()}`,
        title: "",
        description: "",
        priceRupees: "25000",
      },
    ]);
  };

  const removeDeliverable = (id: string) => {
    if (deliverables.length <= 1) return;
    setDeliverables((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDeliverable = (id: string, patch: Partial<DeliverableDraft>) => {
    setDeliverables((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
  };

  // Terms manipulation
  const addTerm = () => {
    setTerms((prev) => [...prev, ""]);
  };

  const updateTerm = (idx: number, val: string) => {
    setTerms((prev) => prev.map((t, i) => (i === idx ? val : t)));
  };

  const removeTerm = (idx: number) => {
    if (terms.length <= 1) return;
    setTerms((prev) => prev.filter((_, i) => i !== idx));
  };

  // Financial calculations
  const subtotalPaise = deliverables.reduce((acc, d) => {
    const r = Math.round(parseFloat(d.priceRupees || "0") * 100);
    return acc + (isNaN(r) ? 0 : r);
  }, 0);

  const taxPaise = Math.round(subtotalPaise * 0.18);
  const totalPaise = subtotalPaise + taxPaise;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Proposal title is required");
      return;
    }
    if (recipientType === "client" && !clientId) {
      toast.error("Please select a client");
      return;
    }
    if (recipientType === "lead" && !leadId) {
      toast.error("Please select a prospective lead");
      return;
    }
    if (deliverables.some((d) => !d.title.trim())) {
      toast.error("All deliverables must have a title");
      return;
    }

    const payload = {
      title: title.trim(),
      clientId: recipientType === "client" ? clientId : undefined,
      leadId: recipientType === "lead" ? leadId : undefined,
      templateId: templateId !== "none" ? templateId : undefined,
      currency: "INR",
      subtotalPaise,
      taxPaise,
      totalPaise,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      content: {
        scopeOverview: scopeOverview.trim(),
        deliverables: deliverables.map((d) => ({
          title: d.title.trim(),
          description: d.description.trim(),
          priceRupees: parseFloat(d.priceRupees || "0"),
          pricePaise: Math.round(parseFloat(d.priceRupees || "0") * 100),
        })),
        terms: terms.filter((t) => t.trim().length > 0),
      },
    };

    try {
      if (isEditing && proposalToEdit) {
        await updateMutation.mutateAsync({
          id: proposalToEdit.id,
          ...payload,
        });
        toast.success("Proposal updated successfully!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Proposal created successfully!");
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? "Failed to update proposal" : "Failed to create proposal");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={isEditing ? "Edit Proposal Draft" : "Create New Proposal"}
      description={
        isEditing
          ? "Modify scope, deliverables, and commercial pricing before dispatching."
          : "Draft a comprehensive client proposal with AI assistance and itemized milestones."
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="proposal-form"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Proposal Draft"}
          </Button>
        </>
      }
      formId="proposal-form"
      onSubmit={handleSubmit}
    >
      <div className="space-y-6 text-xs">
        {/* AI Quick Draft Box */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-display text-sm font-semibold text-foreground">
              ✨ AI Proposal Copilot
            </span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              Gemini Powered
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Type your brief or client requirements to auto-generate a structured title, executive scope, and itemized deliverables.
          </p>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. 3-month brand strategy & website build for an organic skincare brand"
              className="text-xs h-9 bg-background/80"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleGenerateAi();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateAi}
              disabled={aiGenerateMutation.isPending}
              className="shrink-0 h-9"
            >
              <Wand2 className="size-3.5 mr-1" />
              {aiGenerateMutation.isPending ? "Generating..." : "Generate AI Draft"}
            </Button>
          </div>
        </div>

        {/* Recipient & Template Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Recipient Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecipientType("client")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-colors ${
                  recipientType === "client"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="size-3.5" /> Active Client
              </button>
              <button
                type="button"
                onClick={() => setRecipientType("lead")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-colors ${
                  recipientType === "lead"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserCheck className="size-3.5" /> Prospective Lead
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{recipientType === "client" ? "Select Client" : "Select Lead"}</Label>
            {recipientType === "client" ? (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose active client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose prospective lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.company ? `(${l.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Template & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Proposal Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Omnichannel Growth & Creative Retainer"
              className="h-9"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Valid Until</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {/* Scope Overview with AI Polish */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-foreground">Executive Summary & Scope</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePolishScope}
              disabled={aiEnhanceMutation.isPending}
              className="h-7 text-[11px] text-primary hover:text-primary"
            >
              <Sparkles className="size-3 mr-1" />
              {aiEnhanceMutation.isPending ? "Polishing..." : "AI Polish Scope"}
            </Button>
          </div>
          <Textarea
            value={scopeOverview}
            onChange={(e) => setScopeOverview(e.target.value)}
            placeholder="Executive overview of agency strategic approach, objectives, and client value proposition..."
            rows={4}
            className="text-xs leading-relaxed"
          />
        </div>

        {/* Dynamic Deliverables Builder */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold text-foreground block">
                Deliverables & Milestone Breakdown
              </Label>
              <span className="text-muted-foreground text-[11px]">
                Define clear deliverables and commercial estimates for each milestone.
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addDeliverable} className="h-8">
              <Plus className="size-3.5 mr-1" /> Add Deliverable
            </Button>
          </div>

          <div className="space-y-3">
            {deliverables.map((del, idx) => (
              <div
                key={del.id}
                className="p-3.5 rounded-xl border bg-muted/20 space-y-2.5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <Input
                      value={del.title}
                      onChange={(e) => updateDeliverable(del.id, { title: e.target.value })}
                      placeholder="Deliverable Title (e.g. Phase 1: Brand Strategy)"
                      className="h-8 text-xs font-semibold"
                      required
                    />
                  </div>

                  {isOwner && (
                    <div className="w-32">
                      <Input
                        type="number"
                        value={del.priceRupees}
                        onChange={(e) => updateDeliverable(del.id, { priceRupees: e.target.value })}
                        placeholder="Price (₹)"
                        className="h-8 text-xs font-mono text-right"
                      />
                    </div>
                  )}

                  {deliverables.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeDeliverable(del.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Scope & Details
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePolishDeliverable(del.id)}
                      className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Sparkles className="size-2.5" /> Polish
                    </button>
                  </div>
                  <Textarea
                    value={del.description}
                    onChange={(e) => updateDeliverable(del.id, { description: e.target.value })}
                    placeholder="Specific activities, outputs, and review criteria for this deliverable..."
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commercial Terms */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">
              Commercial Terms & Warranties
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={addTerm} className="h-7 text-xs">
              <Plus className="size-3 mr-1" /> Add Clause
            </Button>
          </div>

          <div className="space-y-2">
            {terms.map((term, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground w-4 text-right">
                  {idx + 1}.
                </span>
                <Input
                  value={term}
                  onChange={(e) => updateTerm(idx, e.target.value)}
                  placeholder="Legal or commercial clause..."
                  className="h-8 text-xs flex-1"
                />
                {terms.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTerm(idx)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Financials & Commercial Overview (Owner only) */}
        {isOwner && (
          <div className="p-4 rounded-xl border bg-muted/40 space-y-2 text-right">
            <div className="flex justify-between text-muted-foreground">
              <span>Estimated Services Subtotal:</span>
              <span className="font-medium text-foreground">{formatINR(subtotalPaise)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Applicable GST (18%):</span>
              <span className="font-medium text-foreground">{formatINR(taxPaise)}</span>
            </div>
            <div className="flex justify-between font-display text-sm font-bold text-foreground pt-2 border-t">
              <span>Total Commercial Investment:</span>
              <span className="text-primary">{formatINR(totalPaise)}</span>
            </div>
          </div>
        )}
      </div>
    </FormSheet>
  );
}
