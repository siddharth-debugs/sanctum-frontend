import {
  LayoutDashboard,
  Users,
  UsersRound,
  CalendarDays,
  FolderKanban,
  Settings,
  TrendingUp,
  FileText,
  Files,
  Receipt,
  MessagesSquare,
  Sheet,
  Sparkles,
  ListChecks,
} from "lucide-react";
import type { SidebarNavSection } from "@/components/app/app-sidebar";

export const APP_NAV: SidebarNavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Clients", url: "/clients", icon: Users, badge: 4 },
      { title: "Projects", url: "/projects", icon: FolderKanban },
      { title: "Team", url: "/team", icon: UsersRound },
      { title: "Calendar", url: "/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Messages", url: "/messages", icon: MessagesSquare },
      { title: "Documents", url: "/documents", icon: Files },
      { title: "Sheets", url: "/sheets", icon: Sheet },
      { title: "AI Assistant", url: "/ai", icon: Sparkles },
      { title: "Task Breakdown", url: "/ai/task-breakdown", icon: ListChecks },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Overview", url: "/finance", icon: TrendingUp },
      { title: "Invoices", url: "/finance/invoices", icon: FileText },
      { title: "Expenses", url: "/finance/expenses", icon: Receipt },
    ],
  },
  {
    label: "Agency",
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];
