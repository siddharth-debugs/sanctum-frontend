"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  Lock,
  Eraser,
  PenTool,
  Scale,
  Building2,
  Check,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/app/glass-card";
import { api } from "@/lib/api/client";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";

export default function PublicAgreementSignPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = React.useState(true);
  const [agreement, setAgreement] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Signing Form State
  const [signerName, setSignerName] = React.useState("");
  const [signerEmail, setSignerEmail] = React.useState("");
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [signMode, setSignMode] = React.useState<"draw" | "type">("type");
  const [typedSignature, setTypedSignature] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Canvas drawing state
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasDrawn, setHasDrawn] = React.useState(false);

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      const res = await api<any>(`/agreements/public/${token}`);
      setAgreement(res);
      if (res.client?.name && !signerName) {
        setSignerName(res.client.name);
      }
      if (res.client?.contactEmail && !signerEmail) {
        setSignerEmail(res.client.contactEmail);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load agreement");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (token) {
      void fetchAgreement();
    }
  }, [token]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      toast.error("Signer name is required");
      return;
    }
    if (!signerEmail.trim()) {
      toast.error("Signer email is required");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the legally binding terms");
      return;
    }

    let signatureDataUrl = "";
    if (signMode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        toast.error("Please provide your signature on the pad");
        return;
      }
      signatureDataUrl = canvas.toDataURL("image/png");
    } else {
      if (!typedSignature.trim()) {
        toast.error("Please type your signature");
        return;
      }
      // Generate a canvas with typed signature
      const offCanvas = document.createElement("canvas");
      offCanvas.width = 400;
      offCanvas.height = 120;
      const ctx = offCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 400, 120);
        ctx.font = "italic 32px 'Brush Script MT', cursive, sans-serif";
        ctx.fillStyle = "#111827";
        ctx.fillText(typedSignature.trim(), 20, 70);
        signatureDataUrl = offCanvas.toDataURL("image/png");
      }
    }

    try {
      setSubmitting(true);
      await api(`/agreements/public/${token}/sign`, {
        method: "POST",
        body: {
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          signatureDataUrl,
        },
      });

      toast.success("Agreement signed successfully!");
      void fetchAgreement();
    } catch {
      toast.error("Failed to sign agreement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-3">
          <Sparkles className="size-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading agreement execution...</p>
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full text-center space-y-4 p-8">
          <XCircle className="size-12 text-destructive mx-auto" />
          <h2 className="font-display text-xl font-semibold">Agreement Unavailable</h2>
          <p className="text-sm text-muted-foreground">{error || "This signing link is invalid or expired."}</p>
        </GlassCard>
      </div>
    );
  }

  const isSigned = agreement.status === "signed" || agreement.status === "active";
  const terms = agreement.terms || {};
  const clauses = terms.clauses || [];

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {agreement.agency?.name || "Sanctum Studio"}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {agreement.title}
            </h1>
            {agreement.agreementNumber && (
              <p className="text-xs font-mono text-muted-foreground">
                Contract Ref: {agreement.agreementNumber}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSigned ? (
              <Badge variant="default" className="text-xs py-1.5 px-3.5 gap-1.5 shadow-sm">
                <Award className="size-3.5" />
                Signed & Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs py-1.5 px-3.5 gap-1.5 shadow-sm">
                <ShieldCheck className="size-3.5" />
                Pending Signature
              </Badge>
            )}
          </div>
        </div>

        {/* Contract Parties & Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <GlassCard className="p-4 space-y-1">
            <span className="text-muted-foreground block uppercase text-[10px] font-semibold tracking-wider">
              Client / Counterparty
            </span>
            <span className="font-semibold text-foreground text-sm block truncate">
              {agreement.client?.name || agreement.clientName || "Client"}
            </span>
          </GlassCard>

          <GlassCard className="p-4 space-y-1">
            <span className="text-muted-foreground block uppercase text-[10px] font-semibold tracking-wider">
              Effective Date
            </span>
            <span className="font-semibold text-foreground text-sm block">
              {agreement.effectiveDate
                ? format(parseISO(agreement.effectiveDate), "MMMM d, yyyy")
                : "Upon Signature"}
            </span>
          </GlassCard>

          {agreement.retainerPaise > 0 && (
            <GlassCard className="p-4 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-muted-foreground block uppercase text-[10px] font-semibold tracking-wider">
                Monthly Retainer
              </span>
              <span className="font-semibold text-foreground text-sm block">
                {formatINR(agreement.retainerPaise)}/mo
              </span>
            </GlassCard>
          )}
        </div>

        {/* Scope of Professional Services */}
        {terms.scope && (
          <GlassCard className="space-y-3 p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Scope of Professional Services
              </h3>
            </div>
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
              {terms.scope}
            </div>
          </GlassCard>
        )}

        {/* Legal Clauses */}
        {clauses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Scale className="size-4 text-primary" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Binding Terms & Conditions ({clauses.length})
              </h3>
            </div>

            <div className="grid gap-3.5">
              {clauses.map((clause: string, idx: number) => (
                <GlassCard key={idx} className="p-5 space-y-1.5 transition-all hover:border-primary/40">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                    Section {idx + 1}.0
                  </span>
                  <p className="text-xs text-foreground/90 leading-relaxed pt-1">{clause}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Digital Signature Execution Section */}
        {!isSigned ? (
          <GlassCard className="p-6 sm:p-7 space-y-6">
            <div className="space-y-1 border-b pb-4">
              <h3 className="font-display font-semibold text-base text-foreground flex items-center gap-2">
                <PenTool className="size-4 text-primary" /> Legally Binding Digital Execution
              </h3>
              <p className="text-xs text-muted-foreground">
                Review terms and sign below in accordance with standard electronic signature laws.
              </p>
            </div>

            <form onSubmit={handleSignAgreement} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Signatory Full Name</Label>
                  <Input
                    value={signerName}
                    onChange={(e) => {
                      setSignerName(e.target.value);
                      if (signMode === "type" && !typedSignature) setTypedSignature(e.target.value);
                    }}
                    placeholder="e.g. Rahul Verma"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Signatory Business Email</Label>
                  <Input
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="rahul@company.com"
                    required
                  />
                </div>
              </div>

              {/* Signature Mode Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Signature Method</Label>
                  <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setSignMode("type")}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        signMode === "type"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Type to Sign
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignMode("draw")}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        signMode === "draw"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Draw Signature
                    </button>
                  </div>
                </div>

                {signMode === "type" ? (
                  <div className="p-4 rounded-xl border bg-card space-y-2">
                    <Input
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Type your full signature here"
                      className="font-serif italic text-lg h-12"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Digital Preview:{" "}
                      <span className="font-serif italic text-lg text-primary ml-1">
                        {typedSignature || signerName || "Signatory Name"}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-xl border bg-white overflow-hidden relative">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={160}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-40 cursor-crosshair touch-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearCanvas}
                        className="text-xs"
                      >
                        <Eraser className="size-3.5 mr-1" /> Clear Pad
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Legal Consent Checkbox */}
              <div className="flex items-start space-x-2.5 pt-2">
                <Checkbox
                  id="consent"
                  checked={agreedToTerms}
                  onCheckedChange={(c) => setAgreedToTerms(Boolean(c))}
                />
                <label
                  htmlFor="consent"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I confirm that I am an authorized signatory of{" "}
                  <strong className="text-foreground">{agreement.client?.name || agreement.clientName || "the Client"}</strong>{" "}
                  and agree that this electronic execution constitutes a legally binding contract under applicable law.
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 text-sm font-semibold gap-2"
                >
                  <Lock className="size-4" />
                  {submitting ? "Executing Contract..." : "Sign & Execute Agreement"}
                </Button>
              </div>
            </form>
          </GlassCard>
        ) : (
          /* Executed Certificate */
          <GlassCard className="p-7 space-y-4 border-emerald-500/40 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <Award className="size-10 text-emerald-500 shrink-0" />
              <div>
                <h3 className="font-display font-semibold text-lg text-foreground">
                  Contract Fully Executed & Active
                </h3>
                <p className="text-xs text-muted-foreground">
                  Executed digitally by <strong className="text-foreground">{agreement.signerName}</strong> ({agreement.signerEmail}) on{" "}
                  {agreement.signedAt ? format(parseISO(agreement.signedAt), "PPpp") : "Record"}.
                </p>
              </div>
            </div>

            {agreement.signatureDataUrl && (
              <div className="p-4 rounded-xl border bg-card flex items-center justify-center min-h-[100px]">
                <img
                  src={agreement.signatureDataUrl}
                  alt="Captured Signature"
                  className="max-h-20 object-contain dark:invert"
                />
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
