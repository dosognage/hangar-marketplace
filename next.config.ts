import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint is enforced separately; don't fail production builds over it
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
