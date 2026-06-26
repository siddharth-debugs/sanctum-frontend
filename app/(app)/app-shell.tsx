"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

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
import { AiChatLauncher, AiChatButton } from "@/components/app/ai-chat-launcher";
import { NotificationBell } from "@/components/app/notification-bell";
import { NoModuleAccess } from "@/components/app/no-module-access";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAV } from "@/lib/nav";
import { canView, moduleForPath, firstAccessibleModule } from "@/lib/permissions";
import { useMe, isUnauthenticated } from "@/hooks/use-me";
import { useClients } from "@/hooks/use-clients";
import { useLogout } from "@/hooks/use-auth";
import { useUnreadCount } from "@/hooks/use-messages";
import { useNotificationStream } from "@/hooks/use-notifications";
import { refreshSession } from "@/lib/api/client";
import { SocketProvider } from "@/lib/socket";
import { SessionProvider } from "./session-context";

/**
 * Keep the session warm: the access token lives 15 min, so refresh every 10 min
 * (and when the tab regains focus after being idle) to avoid a 401 storm.
 */
function useSessionKeepAlive() {
  React.useEffect(() => {
    const INTERVAL_MS = 10 * 60 * 1000;
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      void refreshSession();
    };
    const id = setInterval(refresh, INTERVAL_MS);
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - last > INTERVAL_MS
      ) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

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
  const pathname = usePathname();
  const logout = useLogout();
  const { data: clients } = useClients();
  const { data: unread } = useUnreadCount();
  useNotificationStream();
  useSessionKeepAlive();
  const activeClients = (clients ?? []).filter((c) => c.status === "active");

  const session = me.data!;
  const permissions = session.permissions;

  // Inject live counts into the static nav, then drop any module the user can't
  // at least VIEW (and any section left empty after filtering).
  const nav = React.useMemo(
    () =>
      APP_NAV.map((section) => ({
        ...section,
        items: section.items
          .filter((item) => !item.module || canView(permissions, item.module))
          .map((item) => {
            if (item.url === "/messages") {
              return { ...item, badge: unread && unread > 0 ? unread : undefined };
            }
            if (item.url === "/clients") {
              return { ...item, badge: activeClients.length || undefined };
            }
            return item;
          }),
      })).filter((section) => section.items.length > 0),
    [unread, activeClients.length, permissions],
  );

  // Route guard: block direct navigation to a module the user can't view.
  const currentModule = moduleForPath(pathname);
  const blocked = currentModule != null && !canView(permissions, currentModule);
  const landing = firstAccessibleModule(permissions);

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
          role: session.user.roleName ?? session.user.role,
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
            <AiChatButton />
            <NotificationBell />
            <ThemeSwitcher />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {blocked ? (
            <NoModuleAccess
              module={currentModule}
              fallbackHref={landing ? `/${landing}` : "/dashboard"}
            />
          ) : (
            children
          )}
        </main>
      </SidebarInset>
      {/* Global floating AI chat — available on every authed page. */}
      <AiChatLauncher />
    </SidebarProvider>
  );
}
