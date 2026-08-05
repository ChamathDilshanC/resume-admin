"use client";

import * as React from "react";
import { useEffect } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SidebarHeader } from "@/components/ui/sidebar";
import type { ResumeNavItem } from "@/components/sidebar-01/types";

export function NavHeader({
  items,
  onSelect,
}: {
  items: ResumeNavItem[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <SidebarHeader>
        <div
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2.5 hover:bg-sidebar-accent"
          onClick={() => setOpen(true)}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
            R
          </div>
          <span className="flex-1 text-sm font-bold text-sidebar-foreground">Resume Admin</span>
          <kbd className="rounded border border-sidebar-border px-1.5 py-0.5 font-[inherit] text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </SidebarHeader>

      <CommandDialog onOpenChange={setOpen} open={open}>
        <Command>
          <CommandInput placeholder="Jump to a section..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Sections">
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
