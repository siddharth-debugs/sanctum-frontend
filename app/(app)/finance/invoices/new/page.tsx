"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { InvoiceForm } from "@/components/app/invoice-form";

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Invoices", href: "/finance/invoices" },
          { label: "New" },
        ]}
        title="New invoice"
        description="Add line items, set GST, and either save a draft or send it to the client."
      />
      <InvoiceForm initialClientId={clientId} />
    </div>
  );
}
