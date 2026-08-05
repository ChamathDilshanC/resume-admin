"use client";

import { motion } from "framer-motion";
import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <motion.button
      onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition-colors hover:bg-gray-800"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.61-3.37-1.19-3.37-1.19-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.89 1.54 2.34 1.1 2.91.84.09-.65.35-1.1.63-1.35-2.22-.25-4.56-1.12-4.56-4.98 0-1.1.39-2 1.03-2.71-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.03a9.4 9.4 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.39.2 2.42.1 2.67.64.71 1.03 1.61 1.03 2.71 0 3.87-2.35 4.72-4.58 4.97.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
      </svg>
      Sign in with GitHub
    </motion.button>
  );
}
