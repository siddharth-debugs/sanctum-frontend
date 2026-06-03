import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserCog,
  Settings,
} from "lucide-react";
import type { SidebarNavSection } from "@/components/app/app-sidebar";

export const APP_NAV: SidebarNavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Clients", url: "/clients", icon: Users, badge: 4 },
      { title: "Calendar", url: "/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Agency",
    items: [
      { title: "Team", url: "/team", icon: UserCog },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];
