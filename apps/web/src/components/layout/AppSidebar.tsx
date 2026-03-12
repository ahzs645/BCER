import { LayoutDashboard, Search, MapPin, Info, Database } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchSourceMeta } from "@/lib/api";
import type { SourceMeta } from "@/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/map", icon: MapPin, label: "Map" },
  { to: "/about", icon: Info, label: "About" },
] as const;

export function AppSidebar() {
  const [meta, setMeta] = useState<SourceMeta | null>(null);

  useEffect(() => {
    fetchSourceMeta().then(setMeta).catch(() => {});
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-cyan-400" />
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary">
              BC Energy Regulator
            </span>
            <span className="text-sm font-semibold text-foreground font-[family-name:var(--font-heading)]">
              BCER Data Viewer
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent text-sidebar-primary font-semibold" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {meta?.dataCurrentTo ? `Current to ${meta.dataCurrentTo}` : "Loading..."}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
