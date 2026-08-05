"use client";

import { motion } from "framer-motion";
import { SignInButton } from "./SignInButton";

export function SignInCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-base font-bold text-white">
        R
      </div>
      <div>
        <h1 className="text-lg font-bold text-gray-900">Resume Admin</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Private editor for resume.json. Access is restricted to a single GitHub account.
        </p>
      </div>
      <SignInButton />
    </motion.div>
  );
}
