import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Experimental flags to help with Turbopack stability
  experimental: {
    // Reduce race conditions in file watching
    turbo: {
      resolveAlias: {},
    },
  },
};

export default nextConfig;
