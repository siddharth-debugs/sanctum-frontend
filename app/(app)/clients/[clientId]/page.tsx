"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Pencil,
  Trash2,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Receipt,
  FolderKanban,
  Wallet,
  FileText,
  MessagesSquare,
  Plus,
  Download,
  Eye,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { HealthBadge } from "@/components/app/health-badge";
import { ProjectCard } from "@/components/app/project-card";
import { ProjectFormSheet } from "@/components/app/project-form-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientFormSheet } from "@/components/app/client-form-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseCategoryBadge } from "@/components/app/finance-badges";
import {
  DocumentCategoryBadge,
  DocumentThumb,
  downloadUrl,
} from "@/components/app/document-badges";
import { DocumentUploadDialog } from "@/components/app/document-upload-dialog";
import { DocumentPreviewModal } from "@/components/app/document-preview-modal";
import { useClient, useUpdateClient } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { useTeam } from "@/hooks/use-team";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactsPanel } from "@/components/app/crm/contacts-panel";
import { ActivityPanel } from "@/components/app/crm/activity-panel";
import { DealsPanel } from "@/components/app/crm/deals-panel";
import { ClientTags } from "@/components/app/crm/client-tags";
import { NewThreadSheet } from "@/components/app/new-thread-sheet";
import { ThreadListItem } from "@/components/app/messages/thread-list-item";
import { useSession } from "../../session-context";
import { useExpenses } from "@/hooks/use-expenses";
import { useDocuments } from "@/hooks/use-documents";
import { useThreads } from "@/hooks/use-messages";
import { useDisclosure } from "@/hooks/use-disclosure";
import { api, ApiError } from "@/lib/api/client";
import { initials, formatDate, formatBytes } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import {
  CLIENT_SOURCE_LABEL,
} from "@/lib/constants/client-options";
import type { Client, Document as AppDocument } from "@/lib/api/types";

/** A single label/value row inside a card. */
function InfoRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 text-sm last:border-b-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function billingLine(c: Client): string | null {
  const parts = [
    c.billingAddress,
    c.billingCity,
    c.billingState,
    c.billingPincode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Real list of this client's projects + a "New project" CTA (client preselected). */
function ClientProjectsTab({
  clientId,
  onNew,
}: {
  clientId: string;
  onNew: () => void;
}) {
  const { data: projects, isLoading, error } = useProjects({ clientId });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Couldn&apos;t load projects. Please retry.
      </p>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
          <FolderKanban className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="font-display text-base font-semibold">
            No projects yet — create one
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Track scopes, milestones, and deliverables for this client.
          </p>
        </div>
        <Button onClick={onNew}>
          <Plus className="size-4" /> New project
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onNew}>
          <Plus className="size-4" /> New project
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} hideClient />
        ))}
      </div>
    </div>
  );
}

/** Real Financials tab: this client's expenses. */
function ClientFinancialsTab({ clientId }: { clientId: string }) {
  const { data: expenses, isLoading: expLoading } = useExpenses({ clientId });

  return (
    <div className="space-y-6">
      {/* Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {expLoading ? (
            <Skeleton className="h-24 w-full rounded-md" />
          ) : !expenses || expenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No expenses tagged to this client.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Date
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Category
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Description
                  </TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wide">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id} className="hover:bg-transparent">
                    <TableCell className="text-sm">
                      {formatDate(e.expenseDate)}
                    </TableCell>
                    <TableCell>
                      <ExpenseCategoryBadge category={e.category} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.description || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatINR(e.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Real Files tab: this client's documents in a compact table + upload shortcut. */
function ClientDocumentsTab({ clientId }: { clientId: string }) {
  const { data: documents, isLoading, error } = useDocuments({ clientId });
  const uploadDialog = useDisclosure();
  const preview = useDisclosure<AppDocument>();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => uploadDialog.onOpen()}>
          <Plus className="size-4" /> Upload file
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-md" />
      ) : error ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load documents. Please retry.
        </p>
      ) : !documents || documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
            <FileText className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold">
              No files for this client yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Upload contracts, briefs, and deliverables to keep everything in
              one place.
            </p>
          </div>
          <Button onClick={() => uploadDialog.onOpen()}>
            <Plus className="size-4" /> Upload file
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Name
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Category
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Added
                  </TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wide">
                    Size
                  </TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => preview.onOpen(d)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <DocumentThumb doc={d} size={32} />
                        <span className="line-clamp-1 max-w-[220px] text-sm font-medium">
                          {d.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DocumentCategoryBadge category={d.category} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(d.createdAt)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {formatBytes(d.sizeBytes)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            preview.onOpen(d);
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={downloadUrl(d)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="size-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <DocumentUploadDialog
        open={uploadDialog.open}
        onOpenChange={uploadDialog.setOpen}
        lockedClientId={clientId}
      />
      <DocumentPreviewModal
        open={preview.open}
        onOpenChange={preview.setOpen}
        doc={preview.data}
      />
    </div>
  );
}

/** Real Messages tab: this client's threads + a "Start conversation" CTA. */
function ClientMessagesTab({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { data: threads, isLoading, error } = useThreads({ clientId });
  const [newOpen, setNewOpen] = React.useState(false);

  const open = (id: string) => router.push(`/messages?thread=${id}`);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="size-4" /> Start conversation
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load conversations. Please retry.
        </p>
      ) : !threads || threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
            <MessagesSquare className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold">
              No conversations with this client yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Start a thread to keep all messages about this client in one
              place.
            </p>
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> Start conversation
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {threads.map((t) => (
              <ThreadListItem
                key={t.id}
                thread={t}
                active={false}
                onSelect={open}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <NewThreadSheet
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultClientId={clientId}
        onCreated={(thread) => open(thread.id)}
      />
    </div>
  );
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = React.use(params);
  const session = useSession();
  const canManage =
    session.user.role === "owner" || session.user.role === "admin";
  const { data: client, isLoading, error } = useClient(clientId);
  const { data: clientProjects } = useProjects({ clientId });
  const { data: team } = useTeam();
  const updateClient = useUpdateClient(clientId);
  const qc = useQueryClient();
  const router = useRouter();
  const formSheet = useDisclosure<Client | null>();
  const projectSheet = useDisclosure();
  const deleteDialog = useDisclosure();
  const [deleting, setDeleting] = React.useState(false);

  // Prefer the backend rollup; fall back to the by-client query count.
  const projectCount = client?.projectCount ?? clientProjects?.length ?? 0;
  // Total invoices is a real backend rollup now (GET /clients/:id).
  const invoiceCount = client?.invoiceCount ?? 0;
  // Documents rollup folded in by GET /clients/:id.
  const documentCount = client?.documentCount ?? 0;

  const onConfirmDelete = async () => {
    if (!client) return;
    setDeleting(true);
    try {
      await api(`/clients/${client.id}/archive`, { method: "POST" });
      toast.success(`${client.name} archived`);
      qc.invalidateQueries({ queryKey: ["clients"] });
      deleteDialog.onClose();
      router.push("/clients");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not archive client",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "Client" }]}
          title="Client not found"
          description="This client may have been removed or you don't have access."
        />
        <Button asChild variant="outline">
          <Link href="/clients">Back to clients</Link>
        </Button>
      </div>
    );
  }

  const phoneDisplay =
    client.phone && `${client.phoneCc ?? ""} ${client.phone}`.trim();
  const billing = billingLine(client);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: client.name },
        ]}
        title={
          <span className="flex items-center gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl text-base font-bold text-white"
              style={{ background: client.brandColor ?? "var(--primary)" }}
            >
              {client.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={client.logoUrl}
                  alt={client.name}
                  className="size-full object-cover"
                />
              ) : (
                initials(client.name)
              )}
            </span>
            <span className="flex items-center gap-3">
              {client.name}
              <HealthBadge health={client.relationshipHealth} />
            </span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {client.industry && <span>{client.industry}</span>}
            {client.industry && client.website && (
              <span className="opacity-40">•</span>
            )}
            {client.website && (
              <a
                href={client.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {client.website.replace(/^https?:\/\//, "")}
                <ExternalLink className="size-3" />
              </a>
            )}
            {!client.industry && !client.website && (
              <span>
                {client.status === "active" ? "Active client" : "Archived client"}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/clients/${client.id}/calendar`}>
                <CalendarDays className="size-4" /> Calendar
              </Link>
            </Button>
            {canManage && (
              <Button variant="outline" onClick={() => formSheet.onOpen(client)}>
                <Pencil className="size-4" /> Edit
              </Button>
            )}
            {canManage && client.status === "active" && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteDialog.onOpen()}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="documents">Files</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Account owner</span>
                  {canManage ? (
                    <Select
                      value={client.ownerId ?? "__none__"}
                      onValueChange={(v) =>
                        updateClient.mutate({ ownerId: v === "__none__" ? null : v })
                      }
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {(team ?? []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.fullName ?? m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm font-medium">{client.ownerName ?? "—"}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Tags</span>
                  <ClientTags clientId={client.id} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={<Mail className="size-3.5" />} label="Email">
                  {client.contactEmail ? (
                    <a
                      href={`mailto:${client.contactEmail}`}
                      className="text-primary hover:underline"
                    >
                      {client.contactEmail}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoRow>
                <InfoRow icon={<Phone className="size-3.5" />} label="Phone">
                  {phoneDisplay || "—"}
                </InfoRow>
                <InfoRow icon={<MapPin className="size-3.5" />} label="Billing address">
                  <span className="max-w-[18rem] text-pretty">
                    {billing || "—"}
                  </span>
                </InfoRow>
                <InfoRow icon={<Receipt className="size-3.5" />} label="GST number">
                  {client.gstNumber || "—"}
                </InfoRow>
                {client.clientSource && (
                  <InfoRow label="Source">
                    {CLIENT_SOURCE_LABEL[client.clientSource]}
                  </InfoRow>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={<FolderKanban className="size-3.5" />} label="Total projects">
                  {projectCount > 0 ? (
                    <span className="font-semibold">{projectCount}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      0 · No projects yet
                    </span>
                  )}
                </InfoRow>
                <InfoRow icon={<Wallet className="size-3.5" />} label="Total invoices">
                  {invoiceCount > 0 ? (
                    <span className="font-semibold">{invoiceCount}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      0 · No invoices yet
                    </span>
                  )}
                </InfoRow>
                <InfoRow icon={<FileText className="size-3.5" />} label="Documents">
                  {documentCount > 0 ? (
                    <span className="font-semibold">{documentCount}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      0 · No files yet
                    </span>
                  )}
                </InfoRow>
                <InfoRow label="Payment terms">
                  {typeof client.paymentTermsDays === "number"
                    ? `${client.paymentTermsDays} days`
                    : "—"}
                </InfoRow>
                <InfoRow icon={<CalendarDays className="size-3.5" />} label="Next follow-up">
                  {client.nextFollowUpAt ? formatDate(client.nextFollowUpAt) : "—"}
                </InfoRow>
                <InfoRow label="Relationship health">
                  {client.relationshipHealth ? (
                    <HealthBadge health={client.relationshipHealth} />
                  ) : (
                    "—"
                  )}
                </InfoRow>
              </CardContent>
            </Card>

            {client.internalNotes && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Internal Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {client.internalNotes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* PROJECTS */}
        <TabsContent value="contacts" className="mt-4">
          <ContactsPanel clientId={client.id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityPanel clientId={client.id} />
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <DealsPanel clientId={client.id} />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <ClientProjectsTab
            clientId={client.id}
            onNew={() => projectSheet.onOpen()}
          />
        </TabsContent>

        {/* FINANCIALS */}
        <TabsContent value="financials" className="mt-4">
          <ClientFinancialsTab clientId={client.id} />
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="mt-4">
          <ClientDocumentsTab clientId={client.id} />
        </TabsContent>

        {/* MESSAGES */}
        <TabsContent value="messages" className="mt-4">
          <ClientMessagesTab clientId={client.id} />
        </TabsContent>
      </Tabs>

      <ClientFormSheet
        open={formSheet.open}
        onOpenChange={formSheet.setOpen}
        client={formSheet.data}
      />

      <ProjectFormSheet
        open={projectSheet.open}
        onOpenChange={projectSheet.setOpen}
        lockedClientId={client.id}
      />

      <Dialog open={deleteDialog.open} onOpenChange={deleteDialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {client.name}?</DialogTitle>
            <DialogDescription>
              This archives the client and hides them from the active list. Their
              content and history are preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => deleteDialog.onClose()}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Archiving…" : "Archive client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
