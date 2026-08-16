"use client";

import * as React from "react";
import {
  ShieldCheck,
  Sparkles,
  Plus,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  Wand2,
  Award,
  Scale,
  FileCheck,
} from "lucide-react";
import { FormSheet } from "@/components/app/form-sheet";
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
  useCreateAgreement,
  useUpdateAgreement,
  useAgreementTemplates,
  useGenerateAiAgreement,
  useEnhanceAiAgreement,
} from "@/hooks/use-agreements";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { useIsOwner } from "@/app/(app)/session-context";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";
import type { Agreement } from "@/lib/api/types";

export interface AgreementFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementToEdit?: Agreement | null;
  defaultClientId?: string;
}

export function AgreementFormSheet({
  open,
  onOpenChange,
  agreementToEdit,
  defaultClientId,
}: AgreementFormSheetProps) {
  const isOwner = useIsOwner();
  const isEditing = Boolean(agreementToEdit);

  // Form State
  const [clientId, setClientId] = React.useState<string>("");
  const [projectId, setProjectId] = React.useState<string>("none");
  const [templateId, setTemplateId] = React.useState<string>("none");
  const [title, setTitle] = React.useState<string>("");
  const [effectiveDate, setEffectiveDate] = React.useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [retainerRupees, setRetainerRupees] = React.useState<string>("");
  const [scopeOverview, setScopeOverview] = React.useState<string>("");
  const [clauses, setClauses] = React.useState<string[]>([
    "1. Scope of Work & Performance: The Agency shall execute professional services in accordance with agreed milestone deliverables.",
    "2. Intellectual Property Rights: Full ownership of final deliverables shall be assigned to the Client upon receipt of full final payment.",
    "3. Confidentiality & Non-Disclosure: Mutual confidentiality binds both parties for all proprietary material and business data.",
    "4. Invoicing & Payment Terms: Invoices are due within 15 business days of issuance via electronic bank transfer.",
    "5. Term & Termination: Either party may terminate this Agreement by providing 30 days written notice.",
  ]);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = React.useState<string>("");

  // Data Queries & Mutations
  const { data: templates = [] } = useAgreementTemplates();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();

  const createMutation = useCreateAgreement();
  const updateMutation = useUpdateAgreement();
  const aiGenerateMutation = useGenerateAiAgreement();
  const aiEnhanceMutation = useEnhanceAiAgreement();

  // Populate form on edit / open
  React.useEffect(() => {
    if (agreementToEdit) {
      setTitle(agreementToEdit.title || "");
      setClientId(agreementToEdit.clientId || "");
      setProjectId(agreementToEdit.projectId || "none");
      setTemplateId(agreementToEdit.templateId || "none");
      if (agreementToEdit.effectiveDate) {
        setEffectiveDate(agreementToEdit.effectiveDate.split("T")[0]);
      }

      if (agreementToEdit.retainerPaise) {
        setRetainerRupees(String(Math.round(agreementToEdit.retainerPaise / 100)));
      } else {
        setRetainerRupees("");
      }

      const terms = (agreementToEdit.terms as any) || {};
      setScopeOverview(terms.scope || terms.scopeOfWork || "");
      if (Array.isArray(terms.clauses) && terms.clauses.length) {
        setClauses(terms.clauses);
      }
    } else {
      setClientId(defaultClientId || clients[0]?.id || "");
      setProjectId("none");
      setTemplateId("none");
      setTitle("");
      setEffectiveDate(new Date().toISOString().split("T")[0]);
      setRetainerRupees("");
      setScopeOverview("");
      setAiPrompt("");
      setClauses([
        "1. Scope of Work & Performance: The Agency shall execute professional services in accordance with agreed milestone deliverables.",
        "2. Intellectual Property Rights: Full ownership of final deliverables shall be assigned to the Client upon receipt of full final payment.",
        "3. Confidentiality & Non-Disclosure: Mutual confidentiality binds both parties for all proprietary material and business data.",
        "4. Invoicing & Payment Terms: Invoices are due within 15 business days of issuance via electronic bank transfer.",
        "5. Term & Termination: Either party may terminate this Agreement by providing 30 days written notice.",
      ]);
    }
  }, [agreementToEdit, defaultClientId, open]);

  // Handle Template selection
  const handleTemplateSelect = (tplId: string) => {
    setTemplateId(tplId);
    if (tplId === "none") return;
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setTitle(tpl.name);
      const t = tpl.terms as any;
      if (t?.scope) setScopeOverview(t.scope);
      if (Array.isArray(t?.clauses)) {
        setClauses(t.clauses);
      }
    }
  };

  // AI Agreement Generation
  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a contract description for AI generation");
      return;
    }

    try {
      const clientName = clients.find((c) => c.id === clientId)?.name || "";
      const retainerNum = retainerRupees ? parseFloat(retainerRupees) : undefined;

      const res = await aiGenerateMutation.mutateAsync({
        prompt: aiPrompt.trim(),
        clientName: clientName || undefined,
        retainerRupees: retainerNum,
      });

      setTitle(res.title);
      setScopeOverview(res.scope);
      if (res.clauses && res.clauses.length) {
        setClauses(res.clauses);
      }

      toast.success(
        res.source === "gemini"
          ? "Contract clauses generated with Gemini AI!"
          : "Contract drafted from legal knowledge base!",
      );
    } catch {
      toast.error("Failed to generate contract with AI");
    }
  };

  // AI Scope Polish
  const handlePolishScope = async () => {
    if (!scopeOverview.trim()) {
      toast.error("Please enter scope text first to polish");
      return;
    }

    try {
      const res = await aiEnhanceMutation.mutateAsync({
        text: scopeOverview,
        context: "Legal Agreement Scope of Professional Services",
        instruction: "Refine and elevate this scope with precise, legally unambiguous agency terminology.",
      });
      setScopeOverview(res.enhancedText);
      toast.success("Scope refined with AI!");
    } catch {
      toast.error("Failed to refine scope");
    }
  };

  // Clauses manipulation
  const addClause = () => {
    setClauses((prev) => [
      ...prev,
      `${prev.length + 1}. Standard Provision: Both parties agree to terms.`,
    ]);
  };

  const updateClause = (idx: number, val: string) => {
    setClauses((prev) => prev.map((c, i) => (i === idx ? val : c)));
  };

  const removeClause = (idx: number) => {
    if (clauses.length <= 1) return;
    setClauses((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Agreement title is required");
      return;
    }
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (clauses.some((c) => !c.trim())) {
      toast.error("All clauses must have content");
      return;
    }

    const parsedRetainer = retainerRupees ? Math.round(parseFloat(retainerRupees) * 100) : 0;
    const payload = {
      title: title.trim(),
      clientId,
      projectId: projectId !== "none" ? projectId : undefined,
      templateId: templateId !== "none" ? templateId : undefined,
      effectiveDate: new Date(effectiveDate).toISOString(),
      retainerPaise: parsedRetainer,
      totalValuePaise: parsedRetainer * 12,
      currency: "INR",
      terms: {
        scope: scopeOverview.trim() || "Agency professional services execution.",
        clauses: clauses.filter((c) => c.trim().length > 0),
      },
    };

    try {
      if (isEditing && agreementToEdit) {
        await updateMutation.mutateAsync({
          id: agreementToEdit.id,
          ...payload,
        });
        toast.success("Agreement updated successfully!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Agreement drafted successfully!");
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? "Failed to update agreement" : "Failed to create agreement");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={isEditing ? "Edit Agreement Draft" : "Create New Agreement"}
      description={
        isEditing
          ? "Modify scope, legal clauses, and monthly retainer terms before sending for e-signature."
          : "Draft a legally binding Master Services Agreement (MSA), SOW, or Retainer contract."
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
            form="agreement-form"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Agreement Draft"}
          </Button>
        </>
      }
      formId="agreement-form"
      onSubmit={handleSubmit}
    >
      <div className="space-y-6 text-xs">
        {/* AI Quick Draft Box */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-primary" />
            <span className="font-display text-sm font-semibold text-foreground">
              ✨ AI Legal Contract Copilot
            </span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              Gemini Powered
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Enter your contract requirements or terms to generate tailored legal clauses (IP ownership, confidentiality, termination, and warranties).
          </p>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Master services agreement for digital marketing retainer with monthly billing and 30-day notice"
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
              {aiGenerateMutation.isPending ? "Generating..." : "Generate AI Clauses"}
            </Button>
          </div>
        </div>

        {/* Template & Client Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Contract Template</Label>
            <Select value={templateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose a contract template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Custom Legal Agreement</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.type.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Client / Counterparty</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Title & Linked Project */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Agreement Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Services Agreement (MSA) — Strategic Retainer"
              className="h-9"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Linked Project (Optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Agency-wide / Specific" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Client Projects</SelectItem>
                {projects
                  .filter((p) => !clientId || p.clientId === clientId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Effective Date & Retainer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Effective Date</Label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="h-9"
              required
            />
          </div>

          {isOwner && (
            <div className="space-y-1.5">
              <Label>Monthly Retainer Value (₹)</Label>
              <Input
                type="number"
                value={retainerRupees}
                onChange={(e) => setRetainerRupees(e.target.value)}
                placeholder="e.g. 75000"
                className="h-9"
              />
            </div>
          )}
        </div>

        {/* Scope Summary with AI Polish */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-foreground">Scope of Professional Services</Label>
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
            placeholder="Executive overview of obligations, deliverables, and service specifications..."
            rows={3}
            className="text-xs leading-relaxed"
          />
        </div>

        {/* Dynamic Legal Clauses Manager */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold text-foreground block">
                Binding Legal Clauses & Terms
              </Label>
              <span className="text-muted-foreground text-[11px]">
                Itemized contract sections that bind both parties upon digital execution.
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addClause} className="h-8">
              <Plus className="size-3.5 mr-1" /> Add Section
            </Button>
          </div>

          <div className="space-y-2.5">
            {clauses.map((clause, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border bg-muted/20 space-y-1.5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-primary">
                    Section {idx + 1}.0
                  </span>
                  {clauses.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeClause(idx)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
                <Textarea
                  value={clause}
                  onChange={(e) => updateClause(idx, e.target.value)}
                  placeholder="Clause title & legal text..."
                  rows={2}
                  className="text-xs leading-relaxed"
                  required
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </FormSheet>
  );
}
