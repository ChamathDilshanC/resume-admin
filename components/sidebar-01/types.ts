import type { ElementType } from "react";

export interface ResumeNavItem {
  id: string;
  title: string;
  icon: ElementType;
  color: string;
  count: number | null;
}
