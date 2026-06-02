import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(isProd ? { output: "export" } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
  // Hide the Next.js dev indicator (the floating "N" badge) so screenshots/mocks
  // aren't cluttered by chrome that doesn't ship to prod anyway.
  devIndicators: false,
};

export default nextConfig;
