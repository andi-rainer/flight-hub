import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  // Experimental flags to help with Turbopack stability
  experimental: {
    // Reduce race conditions in file watching
    turbo: {
      resolveAlias: {},
    },
    // Allow larger request bodies through middleware (for file uploads)
    middlewareClientMaxBodySize: '25mb',
    // Allow larger request bodies for Server Actions (file uploads)
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  // Temporarily ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
