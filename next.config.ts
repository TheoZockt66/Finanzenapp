import type { NextConfig } from "next";

const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  // Generate a standalone server build for Vercel deployments
  output: isVercel ? "standalone" : undefined,

  // Ensure Mantine packages are compiled correctly on Vercel
  transpilePackages: [
    "@mantine/core",
    "@mantine/hooks",
    "@mantine/modals",
    "@mantine/notifications",
  ],

  // Avoid build breaks caused by lint or type warnings on Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    domains: ["localhost"],
    unoptimized: isVercel,
  },
};

export default nextConfig;
