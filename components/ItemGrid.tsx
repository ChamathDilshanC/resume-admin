"use client";

import type { ElementType, ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconButton } from "@/components/FormControls";
import { GridIcon, ListIcon, TrashIcon, ChevronRightIcon } from "@/components/icons";

const ICON_BADGE_COLORS: Record<string, string> = {
  violet: "bg-violet-100 text-violet-600",
  teal: "bg-teal-100 text-teal-600",
  amber: "bg-amber-100 text-amber-600",
  sky: "bg-sky-100 text-sky-600",
  rose: "bg-rose-100 text-rose-600",
  emerald: "bg-emerald-100 text-emerald-600",
  slate: "bg-slate-100 text-slate-600",
};

function ViewToggle({
  view,
  onChange,
}: {
  view: "grid" | "list";
  onChange: (view: "grid" | "list") => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
      {(["grid", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`relative flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            view === v ? "text-white" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {view === v && (
            <motion.div
              layoutId="view-toggle-pill"
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="absolute inset-0 rounded-md bg-brand"
            />
          )}
          <span className="relative z-10">
            {v === "grid" ? <GridIcon className="h-3.5 w-3.5" /> : <ListIcon className="h-3.5 w-3.5" />}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ItemGrid<T>({
  items,
  icon: Icon,
  color = "slate",
  getTitle,
  getSubtitle,
  onRemove,
  renderDetail,
  columns = "lg:grid-cols-2",
}: {
  items: T[];
  icon?: ElementType;
  color?: string;
  getTitle: (item: T) => string;
  getSubtitle?: (item: T) => string;
  onRemove: (index: number) => void;
  renderDetail: (item: T, index: number) => ReactNode;
  columns?: string;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openItem = openIndex !== null ? items[openIndex] : null;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "grid" ? (
        <div className={`grid grid-cols-1 gap-4 ${columns}`}>
          {items.map((item, i) => (
            <motion.button
              key={i}
              type="button"
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setOpenIndex(i)}
              className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md"
            >
              {Icon && (
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ICON_BADGE_COLORS[color]}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{getTitle(item) || "Untitled"}</p>
                {getSubtitle && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{getSubtitle(item)}</p>
                )}
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onRemove(i);
                  }
                }}
                className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              >
                <TrashIcon className="h-4 w-4" />
              </span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIndex(i)}
              className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                i > 0 ? "border-t border-gray-100" : ""
              }`}
            >
              {Icon && (
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_BADGE_COLORS[color]}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span className="truncate text-sm font-medium text-gray-900">{getTitle(item) || "Untitled"}</span>
                {getSubtitle && (
                  <span className="ml-2 truncate text-xs text-gray-500">{getSubtitle(item)}</span>
                )}
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onRemove(i);
                  }
                }}
                className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              >
                <TrashIcon className="h-4 w-4" />
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
          {openItem !== null && openIndex !== null && (
            <>
              <DialogHeader>
                <DialogTitle>{getTitle(openItem) || "Untitled"}</DialogTitle>
              </DialogHeader>
              <div className="mt-2">{renderDetail(openItem, openIndex)}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
