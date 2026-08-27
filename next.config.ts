import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Default is 1MB, silently rejected before the action even runs —
      // too small for mockup/screenshot uploads (up to 10MB, matching the
      // validation in app/dashboard/actions.ts's uploadDriveFile).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
