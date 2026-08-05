"use client";

import * as React from "react";
import { useEffect } from "react";
import { Search } from "lucide-react";
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
      <SidebarHeader className="gap-3 px-2 pt-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-wordmark.png" alt="DevResume" className="h-6 w-auto object-contain px-1" />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm text-muted-foreground">Search...</span>
          <kbd className="rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 font-[inherit] text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>
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
