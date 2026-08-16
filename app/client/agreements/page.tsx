"use client";

import * as React from "react";
import {
  ShieldCheck,
  Award,
  Clock,
  Calendar,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientPortalAgreements } from "@/hooks/use-client-portal";
import { formatINR } from "@/lib/money";

export default function ClientAgreementsPage() {
  const { data: agreements = [], isLoading } = useClientPortalAgreements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
          <ShieldCheck className="size-6 text-primary" />
          Contracts & Agreements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review, e-sign, and access executed service agreements, monthly retainers, and NDAs.
        </p>
      </div>

      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Loading agreements...</div>
        ) : agreements.length === 0 ? (
          <div className="py-20 text-center">
            <ShieldCheck className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-display font-medium text-foreground">No contracts yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Your executed agreements and contracts pending signature will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {agreements.map((agr: any) => {
              const isSigned = agr.status === "signed" || agr.status === "active";

              return (
                <div
                  key={agr.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold text-base text-foreground">
                        {agr.title}
                      </span>
                      {agr.agreementNumber && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {agr.agreementNumber}
                        </span>
                      )}
                      {isSigned ? (
                        <Badge variant="default" className="text-xs gap-1">
                          <Award className="size-3" />
                          Signed & Executed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Clock className="size-3" />
                          Awaiting Signature
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {agr.effectiveDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          Effective: {format(parseISO(agr.effectiveDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {agr.retainerPaise != null && agr.retainerPaise > 0 && (
                        <span className="font-bold text-foreground">
                          Retainer: {formatINR(agr.retainerPaise)}/mo
                        </span>
                      )}
                      {agr.signedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Signed by {agr.signerName || "Authorized Signatory"} on{" "}
                          {format(parseISO(agr.signedAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {agr.token && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/agreements/sign/${agr.token}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="size-3.5" />
                          {isSigned ? "View Agreement" : "Review & Sign"}
                        </a>
                      </Button>
                    )}

                    {!isSigned && agr.token && (
                      <Button size="sm" asChild>
                        <a href={`/agreements/sign/${agr.token}`}>
                          <CheckCircle2 className="size-3.5" />
                          Sign Now
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
