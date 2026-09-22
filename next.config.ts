import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Default is 1MB, silently rejected before the action even runs —
      // too small for mockup/screenshot uploads (up to 10MB) or animation
      // video uploads (up to 100MB), matching the validation in
      // app/dashboard/actions.ts's uploadDriveFile.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
