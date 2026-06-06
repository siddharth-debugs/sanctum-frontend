"use client";

import * as React from "react";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { InvoiceForm } from "@/components/app/invoice-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoice } from "@/hooks/use-invoices";

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = React.use(params);
  const { data: invoice, isLoading, error } = useInvoice(invoiceId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Finance", href: "/finance" },
            { label: "Invoices", href: "/finance/invoices" },
            { label: "Edit" },
          ]}
          title="Invoice not found"
          description="This invoice may have been removed or you don't have access."
        />
        <Button asChild variant="outline">
          <Link href="/finance/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Invoices", href: "/finance/invoices" },
          { label: invoice.invoiceNumber, href: `/finance/invoices/${invoice.id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${invoice.invoiceNumber}`}
        description="Update line items, GST, dates, and notes."
      />
      <InvoiceForm invoice={invoice} />
    </div>
  );
}
