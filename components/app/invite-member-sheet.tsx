"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Check, Link2 } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/app/form-sheet";
import {
  TextField,
  TextareaField,
  SelectField,
  NumberField,
} from "@/components/fields";
import { ROLE_OPTIONS } from "@/lib/constants/team-options";
import {
  useInviteMember,
  useUpdateMember,
  type InviteMemberInput,
  type UpdateMemberInput,
} from "@/hooks/use-team";
import { ApiError } from "@/lib/api/client";
import { toPaise, fromPaise } from "@/lib/money";
import type { Role, TeamMember } from "@/lib/api/types";

const FORM_ID = "invite-member-form";

const memberSchema = z.object({
  fullName: z.string().min(2, "Name is too short").max(80),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["member", "admin"]),
  phone: z.string().max(20).optional().or(z.literal("")),
  designation: z.string().max(80).optional().or(z.literal("")),
  department: z.string().max(80).optional().or(z.literal("")),
  /** Rupees (display); converted to paise on submit. */
  hourlyRate: z.number().min(0).optional(),
  weeklyCapacityHrs: z.number().min(0).max(168).optional(),
  /** Comma-separated; split to array on submit. */
  skills: z.string().max(400).optional().or(z.literal("")),
});

type MemberFormValues = z.infer<typeof memberSchema>;

/** Small muted section heading between form blocks. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
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
  const invite = useInviteMember();
  const update = useUpdateMember(member?.id ?? "");
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "member",
      phone: "",
      designation: "",
      department: "",
      hourlyRate: undefined,
      weeklyCapacityHrs: 40,
      skills: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      setInviteUrl(null);
      form.reset({
        fullName: member?.fullName ?? "",
        email: member?.email ?? "",
        role: (member?.role === "admin" ? "admin" : "member") as
          | "member"
          | "admin",
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

  const splitSkills = (csv?: string): string[] =>
    (csv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const onSubmit = (values: MemberFormValues) => {
    const skills = splitSkills(values.skills);
    const hourlyRate =
      typeof values.hourlyRate === "number"
        ? toPaise(values.hourlyRate)
        : undefined;

    if (isEdit) {
      const payload: UpdateMemberInput = {
        fullName: values.fullName,
        role: values.role as Role,
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

    const payload: InviteMemberInput = {
      fullName: values.fullName,
      email: values.email,
      role: values.role as Role,
      phone: values.phone || undefined,
      designation: values.designation || undefined,
      department: values.department || undefined,
      hourlyRate,
      weeklyCapacityHrs: values.weeklyCapacityHrs,
      skills: skills.length ? skills : undefined,
    };
    invite.mutate(payload, {
      onSuccess: (res) => {
        toast.success("Member added");
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
  };

  const pending = invite.isPending || update.isPending;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit member" : "Invite member"}
      description={
        isEdit
          ? "Update this teammate's role, profile, and capacity."
          : "Add a teammate and we'll generate an invite link for them to join."
      }
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

          {/* IDENTITY */}
          <section>
            <SectionHeading>Identity</SectionHeading>
            <div className="space-y-5">
              <TextField
                control={form.control}
                name="fullName"
                label="Full name"
                placeholder="Aanya Sharma"
                required
              />
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                placeholder="aanya@agency.com"
                required
                disabled={isEdit}
                description={
                  isEdit ? "Email can't be changed after joining." : undefined
                }
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  control={form.control}
                  name="role"
                  label="Role"
                  placeholder="Select role"
                  options={ROLE_OPTIONS}
                  required
                />
                <TextField
                  control={form.control}
                  name="phone"
                  label="Phone"
                  type="tel"
                  placeholder="98765 43210"
                />
              </div>
            </div>
          </section>

          {/* WORK DETAILS */}
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
        </div>
      </Form>
    </FormSheet>
  );
}
