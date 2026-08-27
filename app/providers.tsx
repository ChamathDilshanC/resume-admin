"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GooeyToaster } from "goey-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delay={200}>
        {children}
        <GooeyToaster position="top-right" theme="light" closeButton />
      </TooltipProvider>
    </SessionProvider>
  );
}
