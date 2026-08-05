"use client";

import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { NavFooter } from "@/components/sidebar-01/nav-footer";
import { NavHeader } from "@/components/sidebar-01/nav-header";
import { NavMain } from "@/components/sidebar-01/nav-main";
import type { ResumeNavItem } from "@/components/sidebar-01/types";

export function AppSidebar({
  items,
  activeId,
  onSelect,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  items: ResumeNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Sidebar {...props}>
      <NavHeader items={items} onSelect={onSelect} />
      <SidebarContent>
        <NavMain activeId={activeId} items={items} onSelect={onSelect} />
      </SidebarContent>
      <NavFooter />
    </Sidebar>
  );
}
