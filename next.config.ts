import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // Next.js 16.3 can report an expected client/HMR disconnect as
    // "The destination stream closed early" followed by ECONNRESET.
    // Propagate cancellation into the RSC render and suppress logs emitted
    // after that render has already been aborted. Genuine render failures
    // still use the normal error path.
    serverComponentsHmrCancellation: true,
    hideLogsAfterAbort: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
