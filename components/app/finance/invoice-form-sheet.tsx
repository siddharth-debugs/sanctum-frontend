"use client";

import * as React from "react";
import {
  Receipt,
  Plus,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { FormSheet } from "@/components/app/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInvoice, type CreateInvoiceInput } from "@/hooks/use-invoices";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";

export interface InvoiceFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

interface LineItemDraft {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rateRupees: string;
  gstRate: number;
}

export function InvoiceFormSheet({
  open,
  onOpenChange,
  defaultClientId,
}: InvoiceFormSheetProps) {
  // Invoice Form State
  const [clientId, setClientId] = React.useState("");
  const [projectId, setProjectId] = React.useState("none");
  const [issueDate, setIssueDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = React.useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
  );
  const [isInterstate, setIsInterstate] = React.useState(false);
  const [notes, setNotes] = React.useState("Thank you for your business!");
  const [terms, setTerms] = React.useState("Payment is due within 15 days of invoice date.");
  const [bankDetails, setBankDetails] = React.useState(
    "HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234 | UPI: agency@hdfcbank",
  );

  const [items, setItems] = React.useState<LineItemDraft[]>([
    {
      id: "item-1",
      description: "Monthly Digital Strategy & Retainer",
      quantity: 1,
      unit: "month",
      rateRupees: "50000",
      gstRate: 18,
    },
  ]);

  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const createMutation = useCreateInvoice();

  React.useEffect(() => {
    if (open) {
      setClientId(defaultClientId || clients[0]?.id || "");
      setProjectId("none");
      setIssueDate(new Date().toISOString().split("T")[0]);
      setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]);
      setIsInterstate(false);
      setItems([
        {
          id: "item-1",
          description: "Monthly Digital Strategy & Retainer",
          quantity: 1,
          unit: "month",
          rateRupees: "50000",
          gstRate: 18,
        },
      ]);
    }
  }, [open, defaultClientId]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unit: "service",
        rateRupees: "0",
        gstRate: 18,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateItem = (id: string, patch: Partial<LineItemDraft>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  // Calculations
  const subtotalPaise = items.reduce((acc, it) => {
    const rate = Math.round(parseFloat(it.rateRupees || "0") * 100);
    return acc + (isNaN(rate) ? 0 : rate) * it.quantity;
  }, 0);

  const taxPaise = items.reduce((acc, it) => {
    const rate = Math.round(parseFloat(it.rateRupees || "0") * 100);
    const itemTotal = (isNaN(rate) ? 0 : rate) * it.quantity;
    return acc + Math.round(itemTotal * (it.gstRate / 100));
  }, 0);

  const totalPaise = subtotalPaise + taxPaise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      toast.error("All line items must have a description");
      return;
    }

    try {
      const payload: CreateInvoiceInput = {
        clientId,
        projectId: projectId !== "none" ? projectId : undefined,
        issueDate: new Date(issueDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        isInterstate,
        notes,
        terms,
        bankDetails,
        items: items.map((it) => ({
          description: it.description.trim(),
          quantity: it.quantity,
          unit: it.unit,
          rate: Math.round(parseFloat(it.rateRupees || "0") * 100),
          gstRate: it.gstRate,
        })),
      };

      await createMutation.mutateAsync(payload);
      toast.success("Invoice generated successfully!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to create invoice");
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="Generate Tax Invoice"
      description="Create a GST-compliant invoice with itemized services, tax rates, and settlement instructions."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="invoice-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Generating..." : "Generate Tax Invoice"}
          </Button>
        </>
      }
      formId="invoice-form"
      onSubmit={handleSubmit}
    >
      <div className="space-y-5 text-xs">
        {/* Client & Linked Project */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Client / Billed Party</Label>
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

          <div className="space-y-1.5">
            <Label>Linked Project (Optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General / No Specific Project</SelectItem>
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

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Issue Date</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="h-9"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9"
              required
            />
          </div>
        </div>

        {/* Interstate GST Toggle */}
        <div className="flex items-center space-x-2.5 p-3 rounded-lg border bg-muted/20">
          <Checkbox
            id="interstate"
            checked={isInterstate}
            onCheckedChange={(c) => setIsInterstate(Boolean(c))}
          />
          <label
            htmlFor="interstate"
            className="text-xs font-medium leading-none text-foreground cursor-pointer"
          >
            Inter-State supply (Charge Integrated GST - IGST instead of CGST + SGST)
          </label>
        </div>

        {/* Line Items Builder */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold text-foreground block">
                Line Items & Services
              </Label>
              <span className="text-muted-foreground text-[11px]">
                Itemize agency billables, retainers, and add-on services.
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8">
              <Plus className="size-3.5 mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border bg-muted/20 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Service description (e.g. Website Design Milestone 1)"
                    className="flex-1 h-8 text-xs font-medium"
                    required
                  />
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, { quantity: parseInt(e.target.value, 10) || 1 })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Rate (₹)</Label>
                    <Input
                      type="number"
                      value={item.rateRupees}
                      onChange={(e) => updateItem(item.id, { rateRupees: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">GST Rate</Label>
                    <Select
                      value={String(item.gstRate)}
                      onValueChange={(val) => updateItem(item.id, { gstRate: parseInt(val, 10) })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="0">0%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="p-4 rounded-xl border bg-muted/40 text-xs space-y-1.5 text-right font-medium">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="text-foreground">{formatINR(subtotalPaise)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{isInterstate ? "IGST:" : "CGST + SGST:"}</span>
              <span className="text-foreground">{formatINR(taxPaise)}</span>
            </div>
            <div className="flex justify-between font-display text-sm font-bold text-foreground pt-2 border-t">
              <span>Grand Total:</span>
              <span className="text-primary">{formatINR(totalPaise)}</span>
            </div>
          </div>
        </div>

        {/* Bank Details & Terms */}
        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-1.5">
            <Label>Bank / UPI Settlement Details</Label>
            <Input
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="Bank Name | Account Number | IFSC | UPI ID"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Invoice Terms & Notes</Label>
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Payment terms and conditions..."
              rows={2}
              className="text-xs"
            />
          </div>
        </div>
      </div>
    </FormSheet>
  );
}
