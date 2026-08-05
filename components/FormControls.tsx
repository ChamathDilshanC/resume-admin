"use client";

import { motion } from "framer-motion";
import { TrashIcon, PlusIcon } from "./icons";

export function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-gray-600">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-gray-600">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </label>
  );
}

export function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="text-sm">
      <span className="mb-1.5 block font-medium text-gray-600">{label}</span>
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <textarea
              value={item}
              rows={2}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            <IconButton onClick={() => onChange(items.filter((_, idx) => idx !== i))} variant="danger">
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </motion.div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-blue-700"
      >
        <PlusIcon className="h-3.5 w-3.5" /> Add item
      </button>
    </div>
  );
}

const BUTTON_STYLES = {
  primary: "bg-brand text-white shadow-sm shadow-brand/25 hover:bg-blue-700",
  secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
  danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_STYLES[variant]}`}
    >
      {children}
    </motion.button>
  );
}

export function IconButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "secondary" | "danger";
}) {
  const styles =
    variant === "danger"
      ? "border-red-200 text-red-500 hover:bg-red-50"
      : "border-gray-200 text-gray-500 hover:bg-gray-50";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white transition-colors ${styles}`}
    >
      {children}
    </motion.button>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
      {children}
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  violet: "bg-violet-50 text-violet-600",
  teal: "bg-teal-50 text-teal-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  slate: "bg-slate-100 text-slate-600",
};

export function CountBadge({ count, color = "slate" }: { count: number; color?: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${BADGE_COLORS[color]}`}>
      {count}
    </span>
  );
}
