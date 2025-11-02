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
  },
};

export default withNextIntl(nextConfig);
