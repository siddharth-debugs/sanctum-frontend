"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AuroraBackground } from "@/components/app/aurora-background";
import { ThemeSwitcher } from "@/components/app/theme-switcher";
import { ActiveTimerBar } from "@/components/app/active-timer-bar";
import { AiChatLauncher } from "@/components/app/ai-chat-launcher";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAV } from "@/lib/nav";
import { useMe, isUnauthenticated } from "@/hooks/use-me";
import { useClients } from "@/hooks/use-clients";
import { useLogout } from "@/hooks/use-auth";
import { useUnreadCount } from "@/hooks/use-messages";
import { SocketProvider } from "@/lib/socket";
import { SessionProvider } from "./session-context";

/** Full-screen splash while we resolve the session. */
function Splash() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <AuroraBackground />
      <div className="flex flex-col items-center gap-4">
        <div
          className="grid size-12 animate-pulse place-items-center rounded-lg font-display text-2xl font-semibold text-primary-foreground"
          style={{
            background:
              "linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 70%,var(--primary)))",
          }}
        >
          S
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useMe();

  // Redirect to /login on an unauthenticated session.
  React.useEffect(() => {
    if (me.isError && isUnauthenticated(me.error)) {
      router.replace("/login");
    }
  }, [me.isError, me.error, router]);

  if (me.isLoading || (me.isError && isUnauthenticated(me.error))) {
    return <Splash />;
  }

  if (me.isError || !me.data) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center p-4 text-center">
        <AuroraBackground />
        <div className="max-w-sm space-y-2">
          <h1 className="font-display text-xl font-semibold">
            Couldn&apos;t reach your workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            The server is unavailable right now. Please retry in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider value={me.data}>
      <SocketProvider authenticated>
        <Shell>{children}</Shell>
      </SocketProvider>
    </SessionProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const logout = useLogout();
  const { data: clients } = useClients();
  const { data: unread } = useUnreadCount();
  const activeClients = (clients ?? []).filter((c) => c.status === "active");

  // Inject live counts into the static nav: a Messages unread badge and the
  // active-client count (reusing the existing SidebarMenuBadge mechanism).
  const nav = React.useMemo(
    () =>
      APP_NAV.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          if (item.url === "/messages") {
            return { ...item, badge: unread && unread > 0 ? unread : undefined };
          }
          if (item.url === "/clients") {
            return { ...item, badge: activeClients.length || undefined };
          }
          return item;
        }),
      })),
    [unread, activeClients.length],
  );

  const session = me.data!;
  const userName = session.user.fullName ?? session.user.email;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AuroraBackground />
      <AppSidebar
        nav={nav}
        agency={{
          name: session.agency?.name ?? "Your agency",
          plan: session.plan?.name,
        }}
        user={{
          name: userName,
          email: session.user.email,
          role: session.user.role,
        }}
        onLogout={() => logout.mutate()}
      />
      <SidebarInset className="relative overflow-hidden">
        <header
          data-print-hide
          className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-[var(--glass-bg)] px-4 backdrop-blur-[var(--glass-blur)]"
        >
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-5" />
          <span className="font-display text-sm font-semibold">Sanctum</span>
          <div className="ml-auto flex items-center gap-2">
            <ActiveTimerBar />
            <ThemeSwitcher />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
      {/* Global floating AI chat — available on every authed page. */}
      <AiChatLauncher />
    </SidebarProvider>
  );
}
