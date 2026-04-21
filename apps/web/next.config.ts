import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/shared"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
