"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { UserPlus, Clock, CheckCircle2, Award } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { LeadsBoard } from "@/components/app/crm/leads-board";
import { FollowUpsCard } from "@/components/app/crm/follow-ups-card";
import { useLeadStats } from "@/hooks/use-leads";

export default function LeadsPage() {
  return (
    <React.Suspense fallback={null}>
      <LeadsContent />
    </React.Suspense>
  );
}

function LeadsContent() {
  const searchParams = useSearchParams();
  const leadParam = searchParams.get("lead");
  const { data: stats } = useLeadStats();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Pipeline & CRM"
        title="Lead Management"
        description="Capture prospective business, track outreach activities, and convert qualified leads into active clients."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Active Leads"
          value={stats?.open ?? 0}
          icon={UserPlus}
          hint="Inbound & active pipeline"
        />
        <KpiCard
          label="New Inbound"
          value={stats?.byStage?.new ?? 0}
          icon={Clock}
          hint="Awaiting qualification"
        />
        <KpiCard
          label="Qualified Deals"
          value={stats?.byStage?.qualified ?? 0}
          icon={Award}
          hint="Vetted prospective business"
        />
        <KpiCard
          label="Converted to Clients"
          value={stats?.converted ?? 0}
          icon={CheckCircle2}
          hint="Total won accounts"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          <LeadsBoard initialLeadId={leadParam} />
        </div>
        <div className="space-y-4">
          <FollowUpsCard />
        </div>
      </div>
    </div>
  );
}
