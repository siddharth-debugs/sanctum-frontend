import {
  LayoutDashboard,
  Users,
  UserPlus,
  UsersRound,
  CalendarDays,
  FolderKanban,
  ListTodo,
  Settings,
  TrendingUp,
  Files,
  FileText,
  FileSignature,
  Receipt,
  FileSpreadsheet,
  MessagesSquare,
  Sheet,
  Sparkles,
  ListChecks,
  CalendarClock,
} from "lucide-react";
import type { SidebarNavSection } from "@/components/app/app-sidebar";

export const APP_NAV: SidebarNavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
      { title: "Leads", url: "/leads", icon: UserPlus, module: "clients" },
      { title: "Clients", url: "/clients", icon: Users, module: "clients" },
      { title: "Projects", url: "/projects", icon: FolderKanban, module: "projects" },
      { title: "Tasks", url: "/tasks", icon: ListTodo, module: "projects" },
      { title: "Team", url: "/team", icon: UsersRound, module: "team" },
      { title: "Attendance", url: "/attendance", icon: CalendarClock, module: "attendance" },
      { title: "Calendar", url: "/calendar", icon: CalendarDays, module: "calendar" },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Proposals", url: "/proposals", icon: FileText, module: "clients" },
      { title: "Agreements", url: "/agreements", icon: FileSignature, module: "documents" },
      { title: "Messages", url: "/messages", icon: MessagesSquare, module: "messages" },
      { title: "Documents", url: "/documents", icon: Files, module: "documents" },
      { title: "Sheets", url: "/sheets", icon: Sheet, module: "sheets" },
      { title: "AI Assistant", url: "/ai", icon: Sparkles, module: "ai" },
      { title: "Task Breakdown", url: "/ai/task-breakdown", icon: ListChecks, module: "ai" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Overview", url: "/finance", icon: TrendingUp, module: "finance" },
      { title: "Invoices", url: "/finance/invoices", icon: FileSpreadsheet, module: "finance" },
      { title: "Expenses", url: "/finance/expenses", icon: Receipt, module: "finance" },
    ],
  },
  {
    label: "Agency",
    items: [
      { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
    ],
  },
];
