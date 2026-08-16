"use client";

import * as React from "react";
import { CalendarCheck, Sparkles, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmployeeDashboard } from "@/components/app/dashboard/employee-dashboard";
import { ManagerDashboard } from "@/components/app/dashboard/manager-dashboard";
import { AdminDashboard } from "@/components/app/dashboard/admin-dashboard";
import { useSession, usePersona } from "../session-context";

/** Per-persona greeting copy — the body below branches to a role dashboard. */
const HEADER_COPY = {
  employee: {
    icon: CalendarCheck,
    kicker: "My day",
    description:
      "Your tasks, time, and attendance in one place — no drilling through clients and projects to find what's yours.",
  },
  manager: {
    icon: Users,
    kicker: "Team overview",
    description:
      "Delivery health, task flow, and who's in today — a read on how the team and its projects are tracking.",
  },
  admin: {
    icon: Sparkles,
    kicker: "Overview",
    description:
      "Plan the month, send posts for approval, and keep an eye on the agency's clients, content, and finances.",
  },
} as const;

export default function DashboardPage() {
  const session = useSession();
  const persona = usePersona();

  // Owner + admin share the agency-wide dashboard; the rest get their own.
  const bucket =
    persona === "employee"
      ? "employee"
      : persona === "manager"
        ? "manager"
        : "admin";
  const copy = HEADER_COPY[bucket];
  const Icon = copy.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <Icon className="size-3" /> {copy.kicker}
          </>
        }
        title={`Welcome${session.user.fullName ? `, ${session.user.fullName}` : ""}`}
        description={copy.description}
      />

      {bucket === "employee" ? (
        <EmployeeDashboard />
      ) : bucket === "manager" ? (
        <ManagerDashboard />
      ) : (
        <AdminDashboard />
      )}
    </div>
  );
}
