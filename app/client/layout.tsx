"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  Files,
  Users2,
  LogOut,
  FileText,
  ShieldCheck,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { AuroraBackground } from "@/components/app/aurora-background";
import { ThemeSwitcher } from "@/components/app/theme-switcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe, isUnauthenticated } from "@/hooks/use-me";
import { useLogout } from "@/hooks/use-auth";
import { useClientMe } from "@/hooks/use-client-portal";
import { getAccessToken, getRefreshToken } from "@/lib/auth-tokens";
import { initials, cn } from "@/lib/utils";

/**
 * Agency logo for the portal header. Uses the agency's uploaded logo when it
 * loads; falls back to the Sanctum brand mark both when there's no logoUrl AND
 * when the configured URL fails to load (e.g. a stale/broken link).
 */
function PortalLogo({ logoUrl, name }: { logoUrl?: string | null; name: string }) {
  const [failed, setFailed] = React.useState(false);
  const src = logoUrl && !failed ? logoUrl : "/sanctum-logo.png?v=3";
  return (
    <Image
      src={src}
      alt={name}
      width={36}
      height={36}
      unoptimized
      onError={() => setFailed(true)}
      className="size-9 shrink-0 rounded-lg object-contain ring-1 ring-[var(--glass-border)]"
    />
  );
}

interface PortalTab {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const TABS: PortalTab[] = [
  { href: "/client", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/client/projects", label: "Projects", icon: FolderKanban },
  { href: "/client/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/client/proposals", label: "Proposals", icon: FileText },
  { href: "/client/agreements", label: "Agreements", icon: ShieldCheck },
  { href: "/client/invoices", label: "Invoices", icon: Receipt },
  { href: "/client/files", label: "Files", icon: Files },
  { href: "/client/team", label: "Team", icon: Users2 },
];

/** Full-screen splash while the session resolves. */
function Splash() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center bg-background p-4 text-foreground">
      <AuroraBackground />
      <div className="z-10 flex flex-col items-center gap-4">
        <div className="flex size-12 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] font-display text-2xl font-bold text-white shadow-lg">
          S
        </div>
        <Skeleton className="h-3 w-24 rounded-full" />
      </div>
    </div>
  );
}

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const brand = useClientMe();
  const logout = useLogout();

  // Bounce to /login when the session is unauthenticated (or no tokens stored).
  React.useEffect(() => {
    const hasTokens = Boolean(getAccessToken() || getRefreshToken());
    if (me.isError && (isUnauthenticated(me.error) || !hasTokens)) {
      router.replace("/login");
    }
  }, [me.isError, me.error, router]);

  // Agency staff don't belong in the client portal — send them to the app root.
  React.useEffect(() => {
    if (me.data && me.data.user.role !== "client") {
      router.replace("/");
    }
  }, [me.data, router]);

  const hasTokens =
    typeof window !== "undefined" &&
    Boolean(getAccessToken() || getRefreshToken());
  const unauthed = me.isError && (isUnauthenticated(me.error) || !hasTokens);

  // While resolving the session, or while a redirect is in-flight, hold the splash.
  if (me.isLoading || unauthed || !me.data || me.data.user.role !== "client") {
    return <Splash />;
  }

  const agency = brand.data?.agency;
  const clientName = brand.data?.client?.name;
  const agencyName = agency?.name ?? "Client Portal";
  const brandColor = agency?.brandColor || "var(--primary)";
  const userName = me.data.user.fullName ?? me.data.user.email;

  return (
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <AuroraBackground />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 md:px-6">
          <Link href="/client" className="flex min-w-0 items-center gap-3">
            <PortalLogo logoUrl={agency?.logoUrl} name={agencyName} />
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold leading-tight">
                {agencyName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Client Portal
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {clientName && (
              <span className="hidden items-center gap-2 rounded-full border border-[var(--glass-border)] bg-card/40 py-1 pl-1 pr-3 sm:inline-flex">
                <span
                  className="grid size-6 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  {initials(clientName)}
                </span>
                <span className="max-w-[10rem] truncate text-xs font-medium">
                  {clientName}
                </span>
              </span>
            )}
            <ThemeSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              title={`Sign out ${userName}`}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-2 md:px-4">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
