"use client";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CountBadge } from "@/components/FormControls";
import type { ResumeNavItem } from "@/components/sidebar-01/types";

export function NavMain({
  items,
  activeId,
  onSelect,
}: {
  items: ResumeNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;

          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={isActive}
                onClick={() => onSelect(item.id)}
                tooltip={item.title}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                <span>{item.title}</span>
              </SidebarMenuButton>
              {item.count !== null && (
                <SidebarMenuBadge>
                  {isActive ? (
                    item.count
                  ) : (
                    <CountBadge count={item.count} color={item.color} />
                  )}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
