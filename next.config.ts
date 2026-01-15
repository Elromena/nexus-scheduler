import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Mount path for Webflow Cloud
  basePath: '/scheduler',
  assetPrefix: '/scheduler',
  
  // Disable image optimization (not supported on edge)
  images: {
    unoptimized: true,
  },
  
  // Enable edge runtime by default for API routes
  experimental: {
    // Enable server actions
  },
};

export default nextConfig;
