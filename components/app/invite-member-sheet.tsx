"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Check, Link2, Users, Building2, FolderKanban } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSheet } from "@/components/app/form-sheet";
import {
  TextField,
  TextareaField,
  SelectField,
  NumberField,
  type SelectOption,
} from "@/components/fields";
import { ROLE_OPTIONS } from "@/lib/constants/team-options";
import {
  useInviteMember,
  useUpdateMember,
  type InviteMemberInput,
  type UpdateMemberInput,
} from "@/hooks/use-team";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { ApiError } from "@/lib/api/client";
import { toPaise, fromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useSession, canManageTargetRole } from "@/app/(app)/session-context";
import type { Role, TeamMember } from "@/lib/api/types";

const FORM_ID = "invite-member-form";

const memberSchema = z
  .object({
    /** Invite kind — only meaningful when creating (not editing). */
    inviteType: z.enum(["member", "client"]),
    fullName: z.string().min(2, "Name is too short").max(80),
    email: z.string().email("Enter a valid email"),
    role: z.enum(["member", "admin"]),
    /** Client-invite target brand. */
    clientId: z.string().optional().or(z.literal("")),
    /** Optional project scope for a client invite. */
    projectIds: z.array(z.string()).optional(),
    phone: z.string().max(20).optional().or(z.literal("")),
    designation: z.string().max(80).optional().or(z.literal("")),
    department: z.string().max(80).optional().or(z.literal("")),
    /** Rupees (display); converted to paise on submit. */
    hourlyRate: z.number().min(0).optional(),
    weeklyCapacityHrs: z.number().min(0).max(168).optional(),
    /** Comma-separated; split to array on submit. */
    skills: z.string().max(400).optional().or(z.literal("")),
  })
  .refine(
    (v) => v.inviteType !== "client" || (!!v.clientId && v.clientId.length > 0),
    { path: ["clientId"], message: "Choose the client (brand) to invite." },
  );

type MemberFormValues = z.infer<typeof memberSchema>;

/** Small muted section heading between form blocks. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

/** Segmented "Team member vs Client" invite-type switch. */
function InviteTypeToggle({
  value,
  onChange,
}: {
  value: "member" | "client";
  onChange: (v: "member" | "client") => void;
}) {
  const opts = [
    { key: "member" as const, label: "Team member", icon: Users },
    { key: "client" as const, label: "Client", icon: Building2 },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border bg-[color-mix(in_srgb,var(--muted-foreground)_6%,transparent)] p-1">
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.icon className="size-4" /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Optional multi-project scope for a client invite. Lists the chosen client's
 * projects as checkboxes; leaving all unchecked grants access to every project.
 */
function ClientProjectPicker({
  clientId,
  value,
  onChange,
}: {
  clientId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: projects, isLoading } = useProjects({ clientId });

  const toggle = (id: string, checked: boolean) =>
    onChange(
      checked ? [...value, id] : value.filter((p) => p !== id),
    );

  return (
    <div className="space-y-2.5 rounded-lg border p-3">
      <p className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <FolderKanban className="size-3.5" /> Project access
        </span>
        <span className="font-normal normal-case tracking-normal">Optional</span>
      </p>
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-md" />
      ) : !projects || projects.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">
          This client has no projects yet — they&apos;ll see new ones as you add them.
        </p>
      ) : (
        <div className="space-y-1.5">
          {projects.map((p) => {
            const checked = value.includes(p.id);
            return (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/60"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => toggle(p.id, c === true)}
                />
                <span className="truncate">{p.name}</span>
              </label>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Leave all unchecked to give this client access to all of their projects.
      </p>
    </div>
  );
}

/** A surfaced invite link with a copy button, shown after a successful invite. */
function InviteLinkRow({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — copy it manually.");
    }
  };
  return (
    <div className="rounded-lg border bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Link2 className="size-3.5" /> Invite link
      </p>
      <div className="flex items-center gap-2">
        <code className="line-clamp-1 flex-1 rounded bg-background/60 px-2 py-1.5 font-mono text-xs">
          {url}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? (
            <>
              <Check className="size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Share this link so they can set a password and join.
      </p>
    </div>
  );
}

export function InviteMemberSheet({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the sheet runs in EDIT mode (PATCH) instead of invite. */
  member?: TeamMember | null;
}) {
  const isEdit = !!member;
  const session = useSession();
  const callerRole = session.user.role;
  const invite = useInviteMember();
  const update = useUpdateMember(member?.id ?? "");
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);

  const { data: clients } = useClients();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      inviteType: "member",
      fullName: "",
      email: "",
      role: "member",
      clientId: "",
      projectIds: [],
      phone: "",
      designation: "",
      department: "",
      hourlyRate: undefined,
      weeklyCapacityHrs: 40,
      skills: "",
    },
  });

  const inviteType = form.watch("inviteType");
  const clientId = form.watch("clientId") ?? "";
  const projectIds = form.watch("projectIds") ?? [];

  React.useEffect(() => {
    if (open) {
      setInviteUrl(null);
      form.reset({
        inviteType: "member",
        fullName: member?.fullName ?? "",
        email: member?.email ?? "",
        role: (member?.role === "admin" ? "admin" : "member") as
          | "member"
          | "admin",
        clientId: "",
        projectIds: [],
        phone: member?.phone ?? "",
        designation: member?.designation ?? "",
        department: member?.department ?? "",
        hourlyRate:
          member?.hourlyRate != null ? fromPaise(member.hourlyRate) : undefined,
        weeklyCapacityHrs: member?.weeklyCapacityHrs ?? 40,
        skills: member?.skills?.length ? member.skills.join(", ") : "",
      });
    }
  }, [open, member, form]);

  // Clear the project scope whenever the chosen client changes.
  const prevClient = React.useRef(clientId);
  React.useEffect(() => {
    if (prevClient.current !== clientId) {
      prevClient.current = clientId;
      form.setValue("projectIds", []);
    }
  }, [clientId, form]);

  // ── Role-option gating (mirrors the backend rank ceiling) ─────────────────
  // On INVITE, a non-owner can only invite roles strictly below their tier, so
  // an admin sees only Member; the owner sees Member + Admin. There is no
  // "invite as owner". On EDIT we surface the target's current role but disable
  // the control when the caller can't manage that target (self / equal / above).
  const targetIsSelf = isEdit && member?.id === session.user.id;
  const targetRole = member?.role ?? "member";
  const targetManageable = !isEdit || canManageTargetRole(callerRole, targetRole);
  const roleFieldDisabled =
    isEdit && (!!targetIsSelf || !targetManageable || targetRole === "owner");
  const roleNote = targetIsSelf
    ? "You can't change your own role."
    : isEdit && !targetManageable
      ? "You can only manage members below your role."
      : undefined;

  const roleOptions: SelectOption[] = isEdit
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((o) => canManageTargetRole(callerRole, o.value));

  const clientOptions: SelectOption[] = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const splitSkills = (csv?: string): string[] =>
    (csv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const runInvite = (payload: InviteMemberInput) =>
    invite.mutate(payload, {
      onSuccess: (res) => {
        toast.success(payload.role === "client" ? "Client invited" : "Member added");
        if (res.inviteUrl) {
          setInviteUrl(res.inviteUrl);
        } else {
          onOpenChange(false);
        }
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't send the invite",
        ),
    });

  const onSubmit = (values: MemberFormValues) => {
    const skills = splitSkills(values.skills);
    const hourlyRate =
      typeof values.hourlyRate === "number"
        ? toPaise(values.hourlyRate)
        : undefined;

    if (isEdit) {
      const payload: UpdateMemberInput = {
        fullName: values.fullName,
        // Never send a role change for a target we can't manage; the server
        // enforces this too, but keeping it out avoids a needless 403.
        ...(roleFieldDisabled ? {} : { role: values.role as Role }),
        phone: values.phone || undefined,
        designation: values.designation || undefined,
        department: values.department || undefined,
        hourlyRate,
        weeklyCapacityHrs: values.weeklyCapacityHrs,
        skills,
      };
      update.mutate(payload, {
        onSuccess: () => {
          toast.success("Member updated");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't save the member",
          ),
      });
      return;
    }

    if (values.inviteType === "client") {
      runInvite({
        fullName: values.fullName,
        email: values.email,
        role: "client",
        clientId: values.clientId || undefined,
        projectIds:
          values.projectIds && values.projectIds.length
            ? values.projectIds
            : undefined,
      });
      return;
    }

    runInvite({
      fullName: values.fullName,
      email: values.email,
      role: values.role as Role,
      phone: values.phone || undefined,
      designation: values.designation || undefined,
      department: values.department || undefined,
      hourlyRate,
      weeklyCapacityHrs: values.weeklyCapacityHrs,
      skills: skills.length ? skills : undefined,
    });
  };

  const pending = invite.isPending || update.isPending;
  const isClientInvite = !isEdit && inviteType === "client";

  const title = isEdit
    ? "Edit member"
    : isClientInvite
      ? "Invite client"
      : "Invite member";
  const description = isEdit
    ? "Update this teammate's role, profile, and capacity."
    : isClientInvite
      ? "Invite a client contact to your portal — we'll generate a secure link for them to join."
      : "Add a teammate and we'll generate an invite link for them to join.";

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      formId={FORM_ID}
      onSubmit={form.handleSubmit(onSubmit)}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {inviteUrl ? "Done" : "Cancel"}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {isEdit ? "Save changes" : "Send invite"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <div className="space-y-7">
          {inviteUrl && <InviteLinkRow url={inviteUrl} />}

          {/* INVITE TYPE — team member vs client (create only) */}
          {!isEdit && (
            <InviteTypeToggle
              value={inviteType}
              onChange={(v) => form.setValue("inviteType", v)}
            />
          )}

          {/* IDENTITY */}
          <section>
            <SectionHeading>
              {isClientInvite ? "Client contact" : "Identity"}
            </SectionHeading>
            <div className="space-y-5">
              <TextField
                control={form.control}
                name="fullName"
                label="Full name"
                placeholder={isClientInvite ? "Rohan Mehta" : "Aanya Sharma"}
                required
              />
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                placeholder={
                  isClientInvite ? "rohan@brand.com" : "aanya@agency.com"
                }
                required
                disabled={isEdit}
                description={
                  isEdit ? "Email can't be changed after joining." : undefined
                }
              />

              {isClientInvite ? (
                <>
                  <SelectField
                    control={form.control}
                    name="clientId"
                    label="Client (brand)"
                    placeholder="Select a client"
                    options={clientOptions}
                    required
                    description="The brand this portal contact will have access to."
                  />
                  {clientId && (
                    <ClientProjectPicker
                      clientId={clientId}
                      value={projectIds}
                      onChange={(ids) => form.setValue("projectIds", ids)}
                    />
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    control={form.control}
                    name="role"
                    label="Role"
                    placeholder="Select role"
                    options={roleOptions}
                    required
                    disabled={roleFieldDisabled}
                    description={roleNote}
                  />
                  <TextField
                    control={form.control}
                    name="phone"
                    label="Phone"
                    type="tel"
                    placeholder="98765 43210"
                  />
                </div>
              )}
            </div>
          </section>

          {/* WORK DETAILS — team members only */}
          {!isClientInvite && (
            <section>
              <SectionHeading>Work details</SectionHeading>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    control={form.control}
                    name="designation"
                    label="Designation"
                    placeholder="Senior Designer"
                  />
                  <TextField
                    control={form.control}
                    name="department"
                    label="Department"
                    placeholder="Creative"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <NumberField
                    control={form.control}
                    name="hourlyRate"
                    label="Hourly rate"
                    placeholder="1500"
                    min={0}
                    prefix="₹"
                    description="Internal cost rate (per hour)."
                  />
                  <NumberField
                    control={form.control}
                    name="weeklyCapacityHrs"
                    label="Weekly capacity"
                    placeholder="40"
                    min={0}
                    max={168}
                    suffix="hrs"
                  />
                </div>
                <TextareaField
                  control={form.control}
                  name="skills"
                  label="Skills"
                  placeholder="Figma, Copywriting, Paid ads"
                  rows={2}
                  description="Comma-separated — e.g. Figma, SEO, Video."
                />
              </div>
            </section>
          )}
        </div>
      </Form>
    </FormSheet>
  );
}
