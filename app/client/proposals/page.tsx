"use client";

import * as React from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientPortalProposals } from "@/hooks/use-client-portal";
import { formatINR } from "@/lib/money";

export default function ClientProposalsPage() {
  const { data: proposals = [], isLoading } = useClientPortalProposals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
          <FileText className="size-6 text-primary" />
          Proposals & Scope Reviews
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review deliverables, commercial estimates, and accept new service scopes prepared for your brand.
        </p>
      </div>

      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Loading proposals...</div>
        ) : proposals.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-display font-medium text-foreground">No active proposals</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Any custom proposal scopes prepared by your agency team will appear here for one-click review and acceptance.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {proposals.map((prop: any) => {
              const isAccepted = prop.status === "accepted" || prop.status === "converted";

              return (
                <div
                  key={prop.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold text-base text-foreground">
                        {prop.title}
                      </span>
                      {prop.proposalNumber && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {prop.proposalNumber}
                        </span>
                      )}
                      {isAccepted ? (
                        <Badge variant="default" className="text-xs gap-1">
                          <CheckCircle2 className="size-3" />
                          Accepted
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Clock className="size-3" />
                          Review Ready
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {prop.validUntil && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          Valid until {format(parseISO(prop.validUntil), "MMM d, yyyy")}
                        </span>
                      )}
                      {prop.totalPaise != null && prop.totalPaise > 0 && (
                        <span className="font-bold text-foreground">
                          Total: {formatINR(prop.totalPaise)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {prop.token && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/proposals/view/${prop.token}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="size-3.5" />
                          Full Review
                        </a>
                      </Button>
                    )}

                    {!isAccepted && prop.token && (
                      <Button size="sm" asChild>
                        <a href={`/proposals/view/${prop.token}`}>
                          <CheckCircle2 className="size-3.5" />
                          Accept Proposal
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
