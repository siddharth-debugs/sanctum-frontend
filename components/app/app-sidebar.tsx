"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut, type LucideIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, initials } from "@/lib/utils";
import type { ModuleKey } from "@/lib/api/types";

export interface SidebarNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string | number;
  /** Module this item belongs to (drives RBAC visibility). */
  module?: ModuleKey;
}

export interface SidebarNavSection {
  label: string;
  items: SidebarNavItem[];
}

export interface AppSidebarProps {
  nav: SidebarNavSection[];
  agency: { name: string; plan?: string };
  user: { name: string; email: string; role?: string };
  onLogout?: () => void;
  clientSwitcher?: {
    clients: { id: string; name: string }[];
    activeId?: string;
    onSelect: (id: string) => void;
  };
}

export function AppSidebar({
  nav,
  agency,
  user,
  onLogout,
  clientSwitcher,
}: AppSidebarProps) {
  const pathname = usePathname();
  const active = clientSwitcher?.clients.find(
    (c) => c.id === clientSwitcher.activeId,
  );

  // Highlight only the MOST-SPECIFIC matching nav item. A naive
  // pathname.startsWith() lights up parent routes too (e.g. Overview "/finance"
  // would stay active on "/finance/invoices"). Match at a segment boundary and
  // pick the longest matching url so each route owns exactly one highlight.
  const activeUrl = nav
    .flatMap((section) => section.items.map((i) => i.url))
    .filter((url) => pathname === url || pathname.startsWith(url + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-0">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sanctum-logo.png?v=2"
            alt="Sanctum"
            width={36}
            height={36}
            className="size-9 shrink-0 object-contain group-data-[collapsible=icon]:size-8"
          />
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight">
              Sanctum
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {agency.name}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {nav.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => {
                const isActive = item.url === activeUrl;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        isActive &&
                          "[background-image:linear-gradient(180deg,var(--primary),color-mix(in_srgb,var(--primary)_85%,#000))] text-primary-foreground hover:text-primary-foreground data-[active=true]:text-primary-foreground",
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge != null && (
                      <SidebarMenuBadge
                        className={cn(
                          isActive
                            ? "text-primary-foreground!"
                            : "text-accent",
                        )}
                      >
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {clientSwitcher && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-md border bg-[color-mix(in_srgb,var(--card)_50%,transparent)] px-2.5 py-2 text-left transition-colors hover:border-ring group-data-[collapsible=icon]:hidden">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#f7b733] to-[#fc4a1a] text-xs font-bold text-white">
                  {active ? initials(active.name) : "—"}
                </span>
                <span className="flex flex-col overflow-hidden">
                  <span className="truncate text-[13px] font-semibold">
                    {active?.name ?? "All clients"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Active client
                  </span>
                </span>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56"
              side="top"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch client
              </DropdownMenuLabel>
              {clientSwitcher.clients.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => clientSwitcher.onSelect(c.id)}
                >
                  <span className="grid size-5 place-items-center rounded bg-secondary text-[10px] font-bold text-secondary-foreground">
                    {initials(c.name)}
                  </span>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md border-t px-1 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:px-0">
              <Avatar className="size-8">
                <AvatarFallback
                  className="text-xs font-bold text-primary-foreground"
                  style={{
                    background:
                      "linear-gradient(135deg,var(--primary),var(--accent))",
                  }}
                >
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate text-[13px] font-semibold">
                  {user.name}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {user.role ? `${user.role} · ` : ""}
                  {agency.plan ? `${agency.plan} plan` : user.email}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onLogout?.()}>
              <LogOut className="mr-2 size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
